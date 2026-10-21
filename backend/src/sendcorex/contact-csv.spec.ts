import { parseContactCsv } from './contact-csv';
const parse = (text: string) => parseContactCsv(Buffer.from(text, 'utf8'));
describe('CSV contact directory parser', () => {
  it('supports UTF-8 BOM, Spanish headers, semicolons, escaped quotes and multiline names', () => {
    const result = parse(
      '\uFEFFCorreo electrónico;Nombre;Apellidos;Teléfono\r\nana@example.com;"Ana; ""María""\nLuz";Pérez;+525555555555\r\n',
    );
    expect(result.valid).toBe(1);
    expect(result.rows[0]).toEqual({
      email: 'ana@example.com',
      name: 'Ana; "María"\nLuz Pérez',
      phone: '+525555555555',
    });
  });
  it('combines repeated emails without losing nonempty names or phones', () => {
    const result = parse(
      'email,name,phone\nANA@example.com,Ana,+52123456789\nana@example.com,,\n',
    );
    expect(result.duplicates).toBe(1);
    expect(result.rows).toEqual([
      { email: 'ana@example.com', name: 'Ana', phone: '+52123456789' },
    ]);
  });
  it('rejects invalid rows and reports their original line numbers', () => {
    const result = parse(
      'email,name\n\ninvalid,No\ncorrect@example.com,Yes\nother@example.com,Extra,Column',
    );
    expect(result.valid).toBe(1);
    expect(result.invalid).toBe(2);
    expect(result.errors.map((row) => row.line)).toEqual([3, 5]);
  });
  it('accepts tab delimiters and email-only directories', () => {
    expect(
      parse('email\tfirst_name\tlast_name\na@example.com\tAna\tPérez').rows[0]
        .name,
    ).toBe('Ana Pérez');
    expect(parse('email\na@example.com').valid).toBe(1);
  });
  it.each([
    'name\nAna',
    'email,name\na@example.com,"unclosed',
    'email,name\na@example.com,wrong"quote',
    'email,name\na@example.com,"closed"wrong',
  ])('rejects malformed files: %s', (text) => {
    expect(() => parse(text)).toThrow();
  });
  it('limits file size, encoding, binary input and row count', () => {
    expect(() => parseContactCsv(Buffer.alloc(2 * 1024 * 1024 + 1))).toThrow();
    expect(() => parseContactCsv(Buffer.from([0xff, 0xff]))).toThrow(/UTF-8/);
    expect(() => parse('email\na@example.com\0')).toThrow();
    expect(() => parse('email\n' + 'a@example.com\n'.repeat(10001))).toThrow(
      /10,000/,
    );
  });
  it('caps reported errors while keeping the real invalid count', () => {
    const result = parse('email\n' + 'invalid\n'.repeat(80));
    expect(result.invalid).toBe(80);
    expect(result.errors).toHaveLength(50);
  });
});
