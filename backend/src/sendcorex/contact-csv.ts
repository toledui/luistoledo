import { BadRequestException } from '@nestjs/common';
import { isEmail } from 'class-validator';

export type ImportedContact = { email: string; name: string; phone?: string };
const aliases: Record<string, string[]> = {
  email: ['email', 'correo', 'correoelectronico', 'emailaddress', 'e-mail'],
  name: [
    'nombre',
    'nombrecompleto',
    'name',
    'fullname',
    'firstname',
    'nombres',
  ],
  lastName: ['apellido', 'apellidos', 'lastname', 'surname'],
  phone: ['telefono', 'phone', 'whatsapp', 'celular', 'movil', 'phonenumber'],
};
const header = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f\s_-]/g, '');

export function parseContactCsv(buffer: Buffer) {
  if (!buffer.length || buffer.length > 2 * 1024 * 1024)
    throw new BadRequestException('El CSV debe pesar entre 1 byte y 2 MB');
  let text: string;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(buffer);
  } catch {
    throw new BadRequestException('Guarda el CSV con codificación UTF-8');
  }
  if (text.includes('\0'))
    throw new BadRequestException('El archivo no es un CSV de texto válido');
  const first = text.split(/\r?\n/, 1)[0];
  const separators = [',', ';', '\t'];
  let quoted = false;
  const counts = new Map(separators.map((separator) => [separator, 0]));
  for (let index = 0; index < first.length; index++) {
    if (first[index] === '"') {
      if (quoted && first[index + 1] === '"') index++;
      else quoted = !quoted;
    } else if (!quoted && counts.has(first[index]))
      counts.set(first[index], counts.get(first[index])! + 1);
  }
  const separator = separators.sort(
    (a, b) => counts.get(b)! - counts.get(a)!,
  )[0];
  const rows: { line: number; cells: string[] }[] = [];
  let cells: string[] = [],
    value = '',
    state: 'plain' | 'quoted' | 'closed' = 'plain',
    line = 1,
    startLine = 1;
  const pushCell = () => {
    if (value.length > 5000)
      throw new BadRequestException(
        `Campo demasiado largo en la línea ${startLine}`,
      );
    cells.push(value.trim());
    value = '';
    state = 'plain';
    if (cells.length > 50)
      throw new BadRequestException('El CSV admite hasta 50 columnas');
  };
  const pushRow = () => {
    pushCell();
    if (cells.some(Boolean)) rows.push({ line: startLine, cells });
    cells = [];
    if (rows.length > 10001)
      throw new BadRequestException(
        'Divide el archivo en CSV de hasta 10,000 registros',
      );
  };
  for (let index = 0; index < text.length; index++) {
    const char = text[index];
    if (state === 'quoted') {
      if (char === '"') {
        if (text[index + 1] === '"') {
          value += '"';
          index++;
        } else state = 'closed';
      } else {
        value += char;
        if (char === '\n') line++;
      }
    } else if (char === separator) pushCell();
    else if (char === '\n' || char === '\r') {
      pushRow();
      if (char === '\r' && text[index + 1] === '\n') index++;
      line++;
      startLine = line;
    } else if (char === '"') {
      if (state === 'closed' || value.trim())
        throw new BadRequestException(`Comillas inválidas en la línea ${line}`);
      value = '';
      state = 'quoted';
    } else if (state === 'closed' && char.trim())
      throw new BadRequestException(
        `Contenido después de comillas en la línea ${line}`,
      );
    else if (state !== 'closed') value += char;
  }
  if (state === 'quoted')
    throw new BadRequestException(
      'El CSV tiene un campo con comillas sin cerrar',
    );
  if (value || cells.length || state === 'closed') pushRow();
  const headings = rows.shift()?.cells.map(header);
  if (!headings?.length) throw new BadRequestException('El CSV está vacío');
  const column = (key: string) =>
    headings.findIndex((value) =>
      aliases[key].some((alias) => header(alias) === value),
    );
  const emailColumn = column('email'),
    nameColumn = column('name'),
    lastColumn = column('lastName'),
    phoneColumn = column('phone');
  if (emailColumn < 0)
    throw new BadRequestException(
      'Incluye una columna email o correo en la primera fila',
    );
  const contacts = new Map<string, ImportedContact>();
  const errors: { line: number; message: string }[] = [];
  let invalid = 0,
    duplicates = 0;
  for (const row of rows) {
    const email = (row.cells[emailColumn] || '').toLowerCase();
    const name = [row.cells[nameColumn], row.cells[lastColumn]]
      .filter(Boolean)
      .join(' ')
      .trim();
    const phone = row.cells[phoneColumn] || undefined;
    const reason =
      row.cells.length !== headings.length
        ? 'El número de columnas no coincide con la cabecera'
        : !isEmail(email) || email.length > 191
          ? 'Correo inválido o ausente'
          : name.length > 160
            ? 'El nombre excede 160 caracteres'
            : (phone?.length || 0) > 40
              ? 'El teléfono excede 40 caracteres'
              : null;
    if (reason) {
      invalid++;
      if (errors.length < 50) errors.push({ line: row.line, message: reason });
      continue;
    }
    const previous = contacts.get(email);
    if (previous) duplicates++;
    contacts.set(email, {
      email,
      name: name || previous?.name || email,
      ...(phone || previous?.phone ? { phone: phone || previous?.phone } : {}),
    });
  }
  return {
    rows: [...contacts.values()],
    totalRows: rows.length,
    valid: contacts.size,
    invalid,
    duplicates,
    errors,
    separator: separator === '\t' ? 'tab' : separator,
  };
}
