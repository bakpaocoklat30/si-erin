/**
 * Department Scoping Helper for SI-ERIN Multi-Department Architecture
 */

export interface DepartmentFilter {
  isScoped: boolean;
  departmentName: string;
}

/**
 * Normalizes and checks if a session user needs department scoping.
 * ADMIN has global access across all departments.
 * POKJA is scoped to their assigned department unless set to 'ALL' or 'Semua Jurusan'.
 */
export function getDepartmentScope(session: any): DepartmentFilter {
  const user = session?.user as any;
  if (!user) {
    return { isScoped: false, departmentName: '' };
  }

  const role = user.role?.toUpperCase();
  const department = user.department?.trim() || '';

  if (role === 'ADMIN' || !department || department.toLowerCase() === 'semua jurusan' || department.toUpperCase() === 'ALL') {
    return { isScoped: false, departmentName: '' };
  }

  return { isScoped: true, departmentName: department };
}

/**
 * Returns a Prisma `where` clause for `student` or relation referencing `student`
 */
export function buildStudentDeptFilter(departmentName: string) {
  return {
    department: {
      contains: departmentName,
      mode: 'insensitive' as const,
    },
  };
}

/**
 * Returns a Prisma `where` clause for `department` relation in `classRoom`
 */
export function buildClassDeptFilter(departmentName: string) {
  return {
    department: {
      OR: [
        { name: { contains: departmentName, mode: 'insensitive' as const } },
        { code: { contains: departmentName, mode: 'insensitive' as const } },
      ],
    },
  };
}

