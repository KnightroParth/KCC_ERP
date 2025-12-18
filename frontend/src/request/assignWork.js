import request from './request';

const entity = 'workassign';

export const assignWork = {
    list: async ({ projectId, workCode }) => {
        return await request.list({ entity, options: { projectId, workCode } });
    },
    listAll: async () => {
        return await request.listAll({ entity });
    },
    create: async (jsonData) => {
        return await request.create({ entity, jsonData });
    },
    update: async (id, jsonData) => {
        return await request.update({ entity, id, jsonData });
    },
    delete: async (id) => {
        return await request.delete({ entity, id });
    },
    // Helper to fetch projects using the existing project entity
    fetchProjects: async () => {
        return await request.listAll({ entity: 'project' });
    },
    // Helper to fetch units
    fetchUnits: async () => {
        return await request.listAll({ entity: 'units' });
    },
    // Helper to fetch units by project
    fetchUnitsByProject: async (projectId) => {
        return await request.filter({ 
            entity: 'units', 
            options: { 
                filter: 'projectId', 
                equal: projectId 
            } 
        });
    },
};
