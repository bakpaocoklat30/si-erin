const fs = require('fs');
const file = 'src/app/api/pokja/assign-students/route.ts';
let data = fs.readFileSync(file, 'utf8');
data = data.replace(/where: { \n        teacherId: teacherId,\n        className: { equals: className, mode: 'insensitive' }\n      data:/, "where: { \n        teacherId: teacherId,\n        className: { equals: className, mode: 'insensitive' }\n      },\n      data:");
fs.writeFileSync(file, data);
