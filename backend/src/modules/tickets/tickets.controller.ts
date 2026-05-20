import { FastifyRequest, FastifyReply } from 'fastify';
import { ticketsService } from './tickets.service';
import { ticketsRepository } from './tickets.repository';
import { joinQueueSchema, transferSchema } from './tickets.schema';
import { ok, created, notFound, badRequest, internalError } from '../../shared/utils/response';
import { getSocketGateway } from '../../realtime/socket.gateway';
import { SOCKET_ON } from '@fila/shared-types';

export const ticketsController = {
  // POST /s/:branchId/join — público, cliente escanea QR
  async joinQueue(request: FastifyRequest<{ Params: { branchId: string }; Body: unknown }>, reply: FastifyReply) {
    const parsed = joinQueueSchema.safeParse(request.body);
    if (!parsed.success) return badRequest(reply, parsed.error.issues[0].message);

    try {
      const result = await ticketsService.joinQueue({
        ...parsed.data,
        branchId: request.params.branchId,
        accountId: '', // resolved from branch lookup inside service
      });

      const io = getSocketGateway();
      io.to(`branch:${request.params.branchId}`).emit(SOCKET_ON.QUEUE_UPDATED, {
        serviceId: result.ticket.serviceId,
        action: 'ticket_joined',
        ticketNumber: result.ticket.ticketNumber,
      });

      return created(reply, result);
    } catch (err: any) {
      if (err.message === 'SERVICE_NOT_FOUND') return notFound(reply, 'Servicio no encontrado');
      if (err.message === 'BRANCH_CLOSED') return badRequest(reply, 'La sucursal está cerrada en este momento');
      return internalError(reply);
    }
  },

  // GET /tickets/:ticketId — público, cliente consulta su turno
  async getStatus(request: FastifyRequest<{ Params: { ticketId: string } }>, reply: FastifyReply) {
    try {
      const result = await ticketsService.getTicketStatus(request.params.ticketId);
      return ok(reply, result);
    } catch (err: any) {
      if (err.code === 'P2025') return notFound(reply, 'Turno no encontrado');
      return internalError(reply);
    }
  },

  // DELETE /tickets/:ticketId — cliente cancela su turno
  async cancelTicket(request: FastifyRequest<{ Params: { ticketId: string } }>, reply: FastifyReply) {
    try {
      const ticket = await ticketsService.cancelTicket(request.params.ticketId);
      const io = getSocketGateway();
      io.to(`ticket:${ticket.id}`).emit(SOCKET_ON.TICKET_CANCELLED, { ticketId: ticket.id });
      io.to(`branch:${ticket.branchId}`).emit(SOCKET_ON.QUEUE_UPDATED, {
        serviceId: ticket.serviceId,
        action: 'ticket_cancelled',
      });
      return ok(reply, { ticketId: ticket.id });
    } catch (err: any) {
      if (err.message === 'TICKET_NOT_CANCELLABLE') return badRequest(reply, 'El turno no puede cancelarse en su estado actual');
      return internalError(reply);
    }
  },

  // POST /operator/:operatorId/call-next — operador llama siguiente
  async callNext(request: FastifyRequest<{ Params: { operatorId: string } }>, reply: FastifyReply) {
    try {
      const ticket = await ticketsService.callNext(request.params.operatorId, request.user.accountId);
      const io = getSocketGateway();
      io.to(`ticket:${ticket.id}`).emit(SOCKET_ON.TICKET_CALLED, {
        ticketId: ticket.id,
        ticketNumber: ticket.ticketNumber,
        operatorName: ticket.attendedBy?.displayName ?? ticket.attendedBy?.name,
        calledAt: ticket.calledAt,
      });
      io.to(`branch:${ticket.branchId}`).emit(SOCKET_ON.TV_STATE_UPDATED, {
        action: 'ticket_called',
        ticketNumber: ticket.ticketNumber,
        operatorName: ticket.attendedBy?.displayName,
        serviceColor: ticket.service.color,
      });
      return ok(reply, ticket);
    } catch (err: any) {
      if (err.message === 'OPERATOR_NOT_FOUND') return notFound(reply, 'Operador no encontrado');
      if (err.message === 'QUEUE_EMPTY') return badRequest(reply, 'No hay turnos en espera');
      return internalError(reply);
    }
  },

  // POST /operator/:operatorId/no-show
  async noShow(request: FastifyRequest<{ Params: { operatorId: string } }>, reply: FastifyReply) {
    try {
      const ticket = await ticketsService.markNoShow(request.params.operatorId, request.user.accountId);
      const io = getSocketGateway();
      io.to(`branch:${ticket.branchId}`).emit(SOCKET_ON.QUEUE_UPDATED, {
        serviceId: ticket.serviceId,
        action: 'no_show',
        ticketNumber: ticket.ticketNumber,
      });
      return ok(reply, ticket);
    } catch (err: any) {
      if (err.message === 'NO_ACTIVE_TICKET') return badRequest(reply, 'No hay turno activo para este operador');
      return internalError(reply);
    }
  },

  // POST /operator/:operatorId/complete
  async complete(request: FastifyRequest<{ Params: { operatorId: string } }>, reply: FastifyReply) {
    try {
      const ticket = await ticketsService.completeTicket(request.params.operatorId, request.user.accountId);
      const io = getSocketGateway();
      io.to(`ticket:${ticket.id}`).emit(SOCKET_ON.TICKET_COMPLETED, { ticketId: ticket.id });
      io.to(`branch:${ticket.branchId}`).emit(SOCKET_ON.QUEUE_UPDATED, {
        serviceId: ticket.serviceId,
        action: 'ticket_completed',
      });
      return ok(reply, ticket);
    } catch (err: any) {
      if (err.message === 'NO_ACTIVE_TICKET') return badRequest(reply, 'No hay turno activo para este operador');
      return internalError(reply);
    }
  },

  // POST /operator/:operatorId/transfer
  async transfer(request: FastifyRequest<{ Params: { operatorId: string }; Body: unknown }>, reply: FastifyReply) {
    const parsed = transferSchema.safeParse(request.body);
    if (!parsed.success) return badRequest(reply, parsed.error.issues[0].message);

    const operator = await import('../../config/database').then(({ prisma }) =>
      prisma.operator.findFirst({
        where: { id: request.params.operatorId, accountId: request.user.accountId },
        select: { currentTicketId: true },
      }),
    );
    if (!operator?.currentTicketId) return badRequest(reply, 'No hay turno activo para transferir');

    try {
      const result = await ticketsService.transferTicket({
        ticketId: operator.currentTicketId,
        targetServiceId: parsed.data.targetServiceId,
        operatorId: request.params.operatorId,
        accountId: request.user.accountId,
      });
      const io = getSocketGateway();
      io.to(`ticket:${result.originalTicketId}`).emit(SOCKET_ON.TICKET_CANCELLED, {
        ticketId: result.originalTicketId,
        reason: 'transferred',
        newTicketId: result.newTicket.id,
        newTicketNumber: result.newTicket.ticketNumber,
      });
      io.to(`branch:${result.newTicket.branchId}`).emit(SOCKET_ON.QUEUE_UPDATED, {
        serviceId: result.newTicket.serviceId,
        action: 'ticket_transferred',
      });
      return ok(reply, result);
    } catch (err: any) {
      if (err.message === 'TICKET_NOT_FOUND') return notFound(reply, 'Turno no encontrado');
      if (err.message === 'TARGET_SERVICE_NOT_FOUND') return notFound(reply, 'Servicio destino no encontrado');
      return internalError(reply);
    }
  },

  // GET /s/:branchId — página pública del cliente (info de sucursal + servicios)
  async getBranchPublicInfo(request: FastifyRequest<{ Params: { branchId: string } }>, reply: FastifyReply) {
    try {
      const data = await ticketsService.getBranchPublicInfo(request.params.branchId);
      return ok(reply, data);
    } catch (err: any) {
      if (err.message === 'BRANCH_NOT_FOUND') return notFound(reply, 'Sucursal no encontrada');
      return internalError(reply);
    }
  },

  // GET /s/:branchId/tv — estado para pantalla pública
  async getTVState(request: FastifyRequest<{ Params: { branchId: string } }>, reply: FastifyReply) {
    const called = await ticketsRepository.getRecentCalledTickets(request.params.branchId, 4);
    return ok(reply, { calledTickets: called });
  },
};
