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
};
