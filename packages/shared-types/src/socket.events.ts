// Socket.io event constants — identical in backend and frontend
// Client → Server
export const SOCKET_EMIT = {
  JOIN_BRANCH_ROOM:    'join:branch',      // Cliente/TV se une al room de la sucursal
  JOIN_TICKET_ROOM:    'join:ticket',      // Cliente se une a su room privado de turno
  JOIN_OPERATOR_ROOM:  'join:operator',    // Operador se une a su room
  OPERATOR_CALL_NEXT:  'operator:call_next',
  OPERATOR_NO_SHOW:    'operator:no_show',
  OPERATOR_TRANSFER:   'operator:transfer',
  OPERATOR_COMPLETE:   'operator:complete',
} as const;

// Server → Client
export const SOCKET_ON = {
  TICKET_CALLED:       'ticket:called',    // El turno del cliente fue llamado
  TICKET_COMPLETED:    'ticket:completed',
  TICKET_CANCELLED:    'ticket:cancelled',
  QUEUE_UPDATED:       'queue:updated',    // Estado de la fila cambió (posición, ETA)
  TV_STATE_UPDATED:    'tv:updated',       // Estado de la pantalla TV
  OPERATOR_STATUS:     'operator:status',  // Estado del operador cambió
} as const;
