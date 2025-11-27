import { useEffect, useState, useRef } from 'react';

function useFetchData(fetchFunction) {
  const [data, setData] = useState(null);
  const [isLoading, setLoading] = useState(true);
  const [isSuccess, setSuccess] = useState(false);
  const [error, setError] = useState(null);
  const fetchFunctionRef = useRef(fetchFunction);

  useEffect(() => {
    // Update ref when fetchFunction changes
    fetchFunctionRef.current = fetchFunction;
    
    async function fetchData() {
      if (!fetchFunctionRef.current) {
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        setError(null);
        setSuccess(false);
        const response = await fetchFunctionRef.current();
        // Handle both { result: [...] } and direct array responses
        const result = response?.result || response || [];
        setData(Array.isArray(result) ? result : []);
        setSuccess(true);
      } catch (err) {
        console.error('useFetch error:', err);
        setError(err);
        setData([]);
        setSuccess(false);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [fetchFunction]);

  return { data, isLoading, isSuccess, error };
}

export default function useFetch(fetchFunction) {
  const { data, isLoading, isSuccess, error } = useFetchData(fetchFunction);

  return { result: data, isLoading, isSuccess, error };
}
