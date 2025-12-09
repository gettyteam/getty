import { ref } from 'vue'
import axios from 'axios'

export function useAdminSettings() {
  const loading = ref(false)
  const error = ref(null)

  async function fetchUnconfiguredModules() {
    try {
      loading.value = true
      const response = await axios.get('/api/admin/modules/unconfigured')
      return response.data.modules
    } catch (err) {
      error.value = 'Failed to fetch modules'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function fetchStreamMetrics() {
    try {
      const response = await axios.get('/api/admin/stream/metrics')
      return response.data.metrics
    } catch (err) {
      error.value = 'Failed to fetch stream metrics'
      throw err
    }
  }

  return {
    loading,
    error,
    fetchUnconfiguredModules,
    fetchStreamMetrics
  }
}
