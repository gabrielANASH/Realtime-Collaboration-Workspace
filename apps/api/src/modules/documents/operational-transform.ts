type EditOperation = {
  type: 'insert' | 'delete' | 'replace';
  position: number;
  content: string;
  length?: number | undefined;
};

export function applyOperation(content: string, edit: EditOperation): string {
  switch (edit.type) {
    case 'insert':
      return content.slice(0, edit.position) + edit.content + content.slice(edit.position);

    case 'delete': {
      const len = edit.length ?? 0;
      return content.slice(0, edit.position) + content.slice(edit.position + len);
    }

    case 'replace': {
      const len = edit.length ?? 0;
      return content.slice(0, edit.position) + edit.content + content.slice(edit.position + len);
    }

    default:
      throw new Error(`Unknown edit type: ${(edit as EditOperation).type}`);
  }
}

export function applyOperations(content: string, edits: EditOperation[]): string {
  let result = content;
  for (const edit of edits) {
    result = applyOperation(result, edit);
  }
  return result;
}
