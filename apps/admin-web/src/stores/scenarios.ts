import { defineStore } from 'pinia';
import { ref } from 'vue';
import api from '@/services/api';

export interface Scenario {
    id: string;
    household_id: string;
    name: string;
    description: string | null;
    created_at: string;
    updated_at: string;
    items?: ScenarioItem[];
}

export interface ScenarioItem {
    id: string;
    scenario_id: string;
    type: 'income_adjustment' | 'expense_adjustment' | 'one_time_expense' | 'one_time_income';
    scope: 'global' | 'category' | 'section';
    category_id?: string | null;
    section_id?: string | null;
    amount: number;
    is_percentage: boolean;
    created_at: string;
    updated_at: string;
}

export interface ScenarioProjection {
    baseline: any;
    projected: any;
    scenario: Scenario;
}

export const useScenariosStore = defineStore('scenarios', () => {
    const scenarios = ref<Scenario[]>([]);
    const currentScenario = ref<Scenario | null>(null);
    const currentProjection = ref<ScenarioProjection | null>(null);
    const isLoading = ref(false);
    const error = ref<string | null>(null);

    async function fetchScenarios() {
        isLoading.value = true;
        error.value = null;
        try {
            const response = await api.get('/scenarios');
            scenarios.value = response.data;
        } catch (err: any) {
            error.value = err.response?.data?.message || 'Failed to fetch scenarios';
            throw err;
        } finally {
            isLoading.value = false;
        }
    }

    async function fetchScenarioById(id: string) {
        isLoading.value = true;
        error.value = null;
        try {
            const response = await api.get(`/scenarios/${id}`);
            currentScenario.value = response.data;
            return response.data;
        } catch (err: any) {
            error.value = err.response?.data?.message || 'Failed to fetch scenario';
            throw err;
        } finally {
            isLoading.value = false;
        }
    }

    async function createScenario(data: { name: string; description?: string }) {
        isLoading.value = true;
        error.value = null;
        try {
            const response = await api.post('/scenarios', data);
            scenarios.value.unshift(response.data);
            return response.data;
        } catch (err: any) {
            error.value = err.response?.data?.message || 'Failed to create scenario';
            throw err;
        } finally {
            isLoading.value = false;
        }
    }

    async function updateScenario(id: string, data: Partial<{ name: string; description: string }>) {
        isLoading.value = true;
        try {
            const response = await api.put(`/scenarios/${id}`, data);
            // Update in list
            const index = scenarios.value.findIndex(s => s.id === id);
            if (index !== -1) {
                scenarios.value[index] = { ...scenarios.value[index], ...response.data };
            }
            // Update current if selected
            if (currentScenario.value?.id === id) {
                currentScenario.value = { ...currentScenario.value, ...response.data };
            }
            return response.data;
        } catch (err: any) {
            error.value = err.response?.data?.message || 'Failed to update scenario';
            throw err;
        } finally {
            isLoading.value = false;
        }
    }

    async function deleteScenario(id: string) {
        isLoading.value = true;
        try {
            await api.delete(`/scenarios/${id}`);
            scenarios.value = scenarios.value.filter(s => s.id !== id);
            if (currentScenario.value?.id === id) {
                currentScenario.value = null;
            }
        } catch (err: any) {
            error.value = err.response?.data?.message || 'Failed to delete scenario';
            throw err;
        } finally {
            isLoading.value = false;
        }
    }

    async function addItem(scenarioId: string, data: any) {
        isLoading.value = true;
        try {
            const response = await api.post(`/scenarios/${scenarioId}/items`, data);
            // Refresh scenario to get updated items
            await fetchScenarioById(scenarioId);
            return response.data;
        } catch (err: any) {
            error.value = err.response?.data?.message || 'Failed to add item';
            throw err;
        } finally {
            isLoading.value = false;
        }
    }

    async function removeItem(itemId: string, scenarioId: string) {
        isLoading.value = true;
        try {
            await api.delete(`/scenarios/items/${itemId}`);
            // Refresh scenario
            await fetchScenarioById(scenarioId);
        } catch (err: any) {
            error.value = err.response?.data?.message || 'Failed to remove item';
            throw err;
        } finally {
            isLoading.value = false;
        }
    }

    async function fetchProjection(scenarioId: string) {
        isLoading.value = true;
        try {
            const response = await api.get(`/scenarios/${scenarioId}/projection`);
            currentProjection.value = response.data;
            return response.data;
        } catch (err: any) {
            error.value = err.response?.data?.message || 'Failed to fetch projection';
            throw err;
        } finally {
            isLoading.value = false;
        }
    }

    return {
        scenarios,
        currentScenario,
        currentProjection,
        isLoading,
        error,
        fetchScenarios,
        fetchScenarioById,
        createScenario,
        updateScenario,
        deleteScenario,
        addItem,
        removeItem,
        fetchProjection
    };
});
