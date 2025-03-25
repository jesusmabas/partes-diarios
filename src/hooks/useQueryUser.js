// src/hooks/useQueryUser.js
import { useQuery } from '@tanstack/react-query';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Hook para consultar usuarios desde Firestore
 * @returns {Object} Objeto con datos de usuarios, estado de carga y error
 */
export const useQueryUser = () => {
  return useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'users'));
        return querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
      } catch (error) {
        console.error("Error al consultar usuarios:", error);
        return []; // Devolver array vacío en caso de error
      }
    },
    // No refetch automáticamente, los usuarios no suelen cambiar con frecuencia
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
};

export default useQueryUser;