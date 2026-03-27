import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { attendanceApi } from '../../../api';
import { AttendanceFilter } from '../../../types';
import { groupRecordsByDay } from '../utils/attendance.utils';

export const MY_ATTENDANCE_RECORDS_KEY = ['attendance', 'my-records'];
export const MY_ATTENDANCE_SUMMARY_KEY = ['attendance', 'my-summary'];

export const useMyAttendance = () => {
  const [filters, setFilters] = useState<AttendanceFilter>({
    page: 1,
    limit: 100, // Fetch more records to group by day
  });

  // My records query
  const recordsQuery = useQuery({
    queryKey: [...MY_ATTENDANCE_RECORDS_KEY, filters],
    queryFn: () => attendanceApi.getMyRecords(filters),
  });

  // Summary query
  const summaryQuery = useQuery({
    queryKey: [...MY_ATTENDANCE_SUMMARY_KEY, filters.startDate, filters.endDate],
    queryFn: () =>
      attendanceApi.getMySummary({
        startDate: filters.startDate,
        endDate: filters.endDate,
      }),
    refetchInterval: 60000, // Refresh every minute for live "hours today"
  });

  // Group records by day
  const dayGroups = useMemo(() => {
    const records = recordsQuery.data?.data || [];
    return groupRecordsByDay(records);
  }, [recordsQuery.data]);

  const updateFilters = (newFilters: Partial<AttendanceFilter>) => {
    setFilters((prev) => ({
      ...prev,
      ...newFilters,
      page: newFilters.page !== undefined ? newFilters.page : 1,
    }));
  };

  const changePage = (page: number) => {
    setFilters((prev) => ({ ...prev, page }));
  };

  return {
    recordsQuery,
    summaryQuery,
    dayGroups,
    filters,
    updateFilters,
    changePage,
  };
};
