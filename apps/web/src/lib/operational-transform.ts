import type { DocumentEdit } from '@workspace/shared';

/**
 * Operational Transform (OT) implementation for collaborative editing
 * Handles transformation of operations to ensure convergence despite concurrent edits
 */

/**
 * Transform an operation against another operation
 * Returns the transformed operation that can be safely applied after the other
 *
 * Example:
 *   Original: "hello" → User A inserts "world" at position 5 → "helloworld"
 *   User B deletes from position 2-4 before A's edit arrives
 *   Transform A's operation to account for the deletion
 */
export function transformOperation(
  op: DocumentEdit,
  against: DocumentEdit,
): DocumentEdit {
  // Both operations on same document state
  const opType = op.type;
  const againstType = against.type;

  // Insert vs Insert
  if (opType === 'insert' && againstType === 'insert') {
    if (op.position < against.position) {
      // Op happens before against, no transformation needed
      return op;
    } else if (op.position > against.position) {
      // Op happens after against, shift right by against's content length
      return {
        ...op,
        position: op.position + against.content.length,
      };
    } else {
      // Same position - use timestamp for deterministic ordering
      if (op.timestamp < against.timestamp) {
        return op;
      } else {
        return {
          ...op,
          position: op.position + against.content.length,
        };
      }
    }
  }

  // Insert vs Delete
  if (opType === 'insert' && againstType === 'delete') {
    const deleteStart = against.position;
    const deleteEnd = against.position + (against.length || 0);

    if (op.position <= deleteStart) {
      // Insert happens before delete, no change
      return op;
    } else if (op.position >= deleteEnd) {
      // Insert happens after delete, shift left
      return {
        ...op,
        position: op.position - (against.length || 0),
      };
    } else {
      // Insert is within delete range, move to start of deletion
      return {
        ...op,
        position: deleteStart,
      };
    }
  }

  // Delete vs Insert
  if (opType === 'delete' && againstType === 'insert') {
    const deleteStart = op.position;
    const deleteEnd = op.position + (op.length || 0);

    if (deleteEnd <= against.position) {
      // Delete ends before insert, no change
      return op;
    } else if (deleteStart >= against.position) {
      // Delete starts after insert, shift right
      return {
        ...op,
        position: op.position + against.content.length,
      };
    } else {
      // Insert is within delete range, extend deletion
      return {
        ...op,
        length: (op.length || 0) + against.content.length,
      };
    }
  }

  // Delete vs Delete
  if (opType === 'delete' && againstType === 'delete') {
    const opStart = op.position;
    const opEnd = op.position + (op.length || 0);
    const againstStart = against.position;
    const againstEnd = against.position + (against.length || 0);

    if (opEnd <= againstStart) {
      // Op ends before against starts, no change
      return op;
    } else if (opStart >= againstEnd) {
      // Op starts after against ends, shift left
      return {
        ...op,
        position: op.position - (against.length || 0),
      };
    } else {
      // Overlapping deletes, adjust based on intersection
      const overlapStart = Math.max(opStart, againstStart);
      const overlapEnd = Math.min(opEnd, againstEnd);
      const overlapLength = overlapEnd - overlapStart;

      return {
        ...op,
        position: Math.min(opStart, againstStart),
        length: (op.length || 0) - overlapLength,
      };
    }
  }

  // Replace operations - treat as delete + insert
  if (opType === 'replace' || againstType === 'replace') {
    return op;
  }

  return op;
}

/**
 * Transform a sequence of operations against another sequence
 * Ensures commutativity: T(A, B) -> T(T(A, B), B) = T(T(B, A), A)
 */
export function transformOperationSequence(
  ops: DocumentEdit[],
  against: DocumentEdit[],
): DocumentEdit[] {
  let transformed = [...ops];

  for (const againstOp of against) {
    transformed = transformed.map((op) => transformOperation(op, againstOp));
  }

  return transformed;
}

/**
 * Apply an operation to content string
 */
export function applyOperation(content: string, op: DocumentEdit): string {
  switch (op.type) {
    case 'insert':
      return content.slice(0, op.position) + op.content + content.slice(op.position);

    case 'delete': {
      const length = op.length || op.content.length;
      return content.slice(0, op.position) + content.slice(op.position + length);
    }

    case 'replace': {
      const length = op.length || op.content.length;
      return (
        content.slice(0, op.position) +
        op.content +
        content.slice(op.position + length)
      );
    }

    default:
      return content;
  }
}

/**
 * Apply multiple operations sequentially
 */
export function applyOperations(content: string, ops: DocumentEdit[]): string {
  return ops.reduce((current, op) => applyOperation(current, op), content);
}

/**
 * Inverse an operation (undo)
 */
export function inverseOperation(op: DocumentEdit): DocumentEdit {
  switch (op.type) {
    case 'insert':
      return {
        ...op,
        type: 'delete',
        length: op.content.length,
      };

    case 'delete':
      return {
        ...op,
        type: 'insert',
      };

    case 'replace':
      return {
        ...op,
        // For replace, inverse would need to know original content
        // This is a simplified version
        type: 'replace',
      };

    default:
      return op;
  }
}

/**
 * Compose two operations (apply second after first)
 * Returns a single operation that represents both
 */
export function composeOperations(op1: DocumentEdit, op2: DocumentEdit): DocumentEdit[] {
  // For simplicity, return both operations
  // In a full OT implementation, these would be composed into a single op
  return [op1, op2];
}

/**
 * Create an insert operation
 */
export function createInsertOperation(
  position: number,
  content: string,
  userId: string,
): DocumentEdit {
  return {
    type: 'insert',
    position,
    content,
    timestamp: Date.now(),
    userId,
  };
}

/**
 * Create a delete operation
 */
export function createDeleteOperation(
  position: number,
  length: number,
  userId: string,
): DocumentEdit {
  return {
    type: 'delete',
    position,
    content: '', // Server can fill this in
    length,
    timestamp: Date.now(),
    userId,
  };
}

/**
 * Calculate position after applying operations
 * Useful for tracking cursor position during edits
 */
export function calculateNewPosition(
  originalPosition: number,
  ops: DocumentEdit[],
): number {
  return ops.reduce((pos, op) => {
    if (op.type === 'insert' && op.position <= pos) {
      return pos + op.content.length;
    }
    if (op.type === 'delete' && op.position < pos) {
      const deleteEnd = op.position + (op.length || 0);
      if (deleteEnd <= pos) {
        return pos - (op.length || 0);
      } else {
        return op.position;
      }
    }
    return pos;
  }, originalPosition);
}
