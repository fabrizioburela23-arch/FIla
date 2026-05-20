// Socket.io event constants — matches @fila/shared-types
export const EMIT = {
  JOIN_BRANCH_ROOM:   'join:branch',
  JOIN_TICKET_ROOM:   'join:ticket',
  JOIN_OPERATOR_ROOM: 'join:operator',
  OPERATOR_CALL_NEXT: 'operator:call_next',
  OPERATOR_NO_SHOW:   'operator:no_show',
  OPERATOR_TRANSFER:  'operator:transfer',
  OPERATOR_COMPLETE:  'operator:complete',
} as const;

export const ON = {
  TICKET_CALLED:      'ticket:called',
  TICKET_COMPLETED:   'ticket:completed',
  TICKET_CANCELLED:   'ticket:cancelled',
  QUEUE_UPDATED:      'queue:updated',
  TV_STATE_UPDATED:   'tv:updated',
  OPERATOR_STATUS:    'operator:status',
} as const;
