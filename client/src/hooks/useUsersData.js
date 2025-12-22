/**
 * useUsersData Hook
 * Manages users data fetching and CRUD operations
 * Single responsibility: Users data state management
 */
import { useState, useCallback, useEffect } from 'react';
import { usersService } from '@/services/users';

export function useUsersData(roleFilter = 'all') {
    const [users, setUsers] = useState([]);
    const [stats, setStats] = useState({ total: 0, student: 0, faculty: 0, driver: 0, admin: 0 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const [usersData, statsData] = await Promise.all([
                usersService.getAll(roleFilter),
                usersService.getStats()
            ]);
            setUsers(usersData);
            setStats(statsData);
        } catch (err) {
            setError('Failed to load users');
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [roleFilter]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const deleteUser = async (userId) => {
        await usersService.delete(userId);
        await loadData();
    };

    const updateUser = async (userId, data) => {
        await usersService.update(userId, data);
        await loadData();
    };

    return {
        users,
        stats,
        loading,
        error,
        refresh: loadData,
        deleteUser,
        updateUser
    };
}

export default useUsersData;
