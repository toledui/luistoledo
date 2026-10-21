import { Prisma } from '@prisma/client';

// Include eligible historical registrations that have not been queued yet, plus
// every delivery (including history whose original registration was removed).
export const contactDirectory = Prisma.sql`
WITH origins AS (
 SELECT CONCAT('masterclass:', m.id) AS dedupeKey, LOWER(m.email) AS email,
 m.name AS name, m.whatsapp AS phone, 'masterclass' AS source
 FROM MasterclassRegistration m WHERE NOT EXISTS
 (SELECT 1 FROM SendcorexDelivery d WHERE d.dedupeKey = CONCAT('masterclass:', m.id))
 UNION ALL
 SELECT CONCAT('course:', e.id), LOWER(u.email), CONCAT(u.firstName, ' ', u.lastName), p.phone, 'curso'
 FROM Enrollment e JOIN User u ON u.id = e.userId LEFT JOIN Profile p ON p.userId = u.id
 WHERE e.status IN ('ACTIVE', 'COMPLETED') AND NOT EXISTS
 (SELECT 1 FROM SendcorexDelivery d WHERE d.dedupeKey = CONCAT('course:', e.id))
 UNION ALL
 SELECT CONCAT('contact:', c.id), LOWER(c.email), c.name, c.phone, 'newsletter'
 FROM ContactRequest c WHERE c.newsletterOptIn = true AND NOT EXISTS
 (SELECT 1 FROM SendcorexDelivery d WHERE d.dedupeKey = CONCAT('contact:', c.id))
 UNION ALL
 SELECT CONCAT('imported:', c.id), LOWER(c.email), c.name, c.phone, 'importado'
 FROM SendcorexImportedContact c WHERE NOT EXISTS
 (SELECT 1 FROM SendcorexDelivery d WHERE d.dedupeKey = CONCAT('imported:', c.id))
 UNION ALL
 SELECT d.dedupeKey, LOWER(JSON_UNQUOTE(JSON_EXTRACT(d.payload, '$.email'))),
 TRIM(CONCAT(COALESCE(JSON_UNQUOTE(JSON_EXTRACT(d.payload, '$.first_name')), ''), ' ',
 COALESCE(JSON_UNQUOTE(JSON_EXTRACT(d.payload, '$.last_name')), ''))),
 NULLIF(JSON_UNQUOTE(JSON_EXTRACT(d.payload, '$.phone')), 'null'), d.source FROM SendcorexDelivery d
), contacts AS (
 SELECT o.email, MAX(o.name) AS name, MAX(o.phone) AS phone,
 GROUP_CONCAT(DISTINCT o.source ORDER BY o.source SEPARATOR ',') AS sources,
 COUNT(*) AS registrations,
 SUM(CASE WHEN d.id IS NULL THEN 1 ELSE 0 END) AS missing,
 SUM(CASE WHEN d.status = 'DELIVERED' THEN 1 ELSE 0 END) AS delivered,
 SUM(CASE WHEN d.status = 'FAILED' THEN 1 ELSE 0 END) AS failed,
 SUM(CASE WHEN d.status IN ('PENDING','PROCESSING') THEN 1 ELSE 0 END) AS pending,
 MAX(d.deliveredAt) AS lastDeliveredAt,
 MAX(d.lastError) AS lastError
 FROM origins o LEFT JOIN SendcorexDelivery d ON d.dedupeKey = o.dedupeKey
 GROUP BY o.email
), directory AS (
 SELECT contacts.*, CASE WHEN failed > 0 THEN 'FAILED' WHEN missing > 0 THEN 'NOT_QUEUED'
 WHEN pending > 0 THEN 'PENDING' ELSE 'DELIVERED' END AS status FROM contacts
)
`;
