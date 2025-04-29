import { getPool } from '../config/database';

interface Organization {
  id?: number;
  name: string;
  org_logo?: string;
  top_web_url?: string;
  background_pub_url?: string;
  created_at?: Date;
}

class OrganizationModel {
  static async findAll(): Promise<Organization[]> {
    const pool = getPool();
    const [rows] = await pool.query('SELECT * FROM organizations');
    return rows as Organization[];
  }

  static async findById(id: number): Promise<Organization | null> {
    const pool = getPool();
    const [rows] = await pool.query('SELECT * FROM organizations WHERE id = ?', [id]);
    const organizations = rows as Organization[];
    return organizations.length ? organizations[0] : null;
  }

  static async create(organization: Organization): Promise<Organization> {
    const pool = getPool();
    const { name, org_logo, top_web_url, background_pub_url } = organization;

    const [result] = await pool.query(
      `INSERT INTO organizations (name, org_logo, top_web_url, background_pub_url) 
             VALUES (?, ?, ?, ?)`,
      [name, org_logo, top_web_url, background_pub_url],
    );

    return {
      id: (result as any).insertId,
      ...organization,
    };
  }

  static async update(id: number, organization: Partial<Organization>): Promise<boolean> {
    const pool = getPool();

    // Build the SET part of the query dynamically based on provided fields
    const fields: string[] = [];
    const values: any[] = [];

    Object.entries(organization).forEach(([key, value]) => {
      if (key !== 'id' && key !== 'created_at') {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    });

    if (fields.length === 0) return false;

    // Add id to values array for the WHERE clause
    values.push(id);

    const [result] = await pool.query(
      `UPDATE organizations SET ${fields.join(', ')} WHERE id = ?`,
      values,
    );

    return (result as any).affectedRows > 0;
  }

  static async delete(id: number): Promise<boolean> {
    const pool = getPool();
    const [result] = await pool.query('DELETE FROM organizations WHERE id = ?', [id]);
    return (result as any).affectedRows > 0;
  }
}

export default OrganizationModel;
export type { Organization };
