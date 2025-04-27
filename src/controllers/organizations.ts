import type { RequestHandler } from 'express';
import OrganizationModel, { Organization } from '../models/Organization';

export const getOrganizations: RequestHandler = async (_, res) => {
    try {
        const organizations = await OrganizationModel.findAll();
        res.json(organizations);
    } catch (error) {
        console.error('Error fetching organizations:', error);
        res.status(500).json({ error: 'Failed to fetch organizations' });
    }
};

export const getOrganizationById: RequestHandler = async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            res.status(400).json({ error: 'Invalid organization ID' });
        }

        const organization = await OrganizationModel.findById(id);
        if (!organization) {
            res.status(404).json({ error: 'Organization not found' });
        }

        res.json(organization);
    } catch (error) {
        console.error('Error fetching organization:', error);
        res.status(500).json({ error: 'Failed to fetch organization' });
    }
};

export const createOrganization: RequestHandler = async (req, res) => {
    try {
        const organizationData: Organization = req.body;

        // Validate required fields
        if (!organizationData.name) {
            res.status(400).json({ error: 'Organization name is required' });
        }

        // Validate string length if needed
        if (organizationData.name.length > 80) {
            res.status(400).json({ error: 'Organization name must be 80 characters or less' });
        }

        const organization = await OrganizationModel.create(organizationData);

        res.status(201).json({
            id: organization.id,
            message: 'Organization created successfully'
        });
    } catch (error) {
        console.error('Error creating organization:', error);
        res.status(500).json({ error: 'Failed to create organization' });
    }
};

export const updateOrganization: RequestHandler = async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            res.status(400).json({ error: 'Invalid organization ID' });
        }

        const organizationData: Partial<Organization> = req.body;

        // Validate string length if name is provided
        if (organizationData.name && organizationData.name.length > 80) {
            res.status(400).json({ error: 'Organization name must be 80 characters or less' });
        }

        const success = await OrganizationModel.update(id, organizationData);
        if (!success) {
            res.status(404).json({ error: 'Organization not found or no changes made' });
        }

        res.json({ message: 'Organization updated successfully' });
    } catch (error) {
        console.error('Error updating organization:', error);
        res.status(500).json({ error: 'Failed to update organization' });
    }
};

export const deleteOrganization: RequestHandler = async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            res.status(400).json({ error: 'Invalid organization ID' });
        }

        const success = await OrganizationModel.delete(id);
        if (!success) {
            res.status(404).json({ error: 'Organization not found' });
        }

        res.json({ message: 'Organization deleted successfully' });
    } catch (error) {
        // Check if the error is due to foreign key constraint
        const isForeignKeyError = error instanceof Error &&
            error.message.includes('foreign key constraint');

        if (isForeignKeyError) {
            res.status(400).json({
                error: 'Cannot delete organization because it has associated events'
            });
        }

        console.error('Error deleting organization:', error);
        res.status(500).json({ error: 'Failed to delete organization' });
    }
};
