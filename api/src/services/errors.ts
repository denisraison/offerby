import { HTTPException } from 'hono/http-exception'

function createJsonResponse(status: number, message: string): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

export class NotFoundError extends HTTPException {
  constructor(message = 'Not found') {
    super(404, { res: createJsonResponse(404, message), message })
  }
}

export class ForbiddenError extends HTTPException {
  constructor(message = 'Forbidden') {
    super(403, { res: createJsonResponse(403, message), message })
  }
}

export class InvalidStateError extends HTTPException {
  constructor(message: string) {
    super(400, { res: createJsonResponse(400, message), message })
  }
}

export class ConflictError extends HTTPException {
  constructor(message = 'Conflict') {
    super(409, { res: createJsonResponse(409, message), message })
  }
}

export class AlreadyExistsError extends HTTPException {
  constructor(message: string) {
    super(400, { res: createJsonResponse(400, message), message })
  }
}

export class UnauthorisedError extends HTTPException {
  constructor(message = 'Invalid credentials') {
    super(401, { res: createJsonResponse(401, message), message })
  }
}

export class ServerError extends HTTPException {
  constructor(message = 'Internal server error') {
    super(500, { res: createJsonResponse(500, message), message })
  }
}
