import { useState } from 'react';

export interface SearchState {
  searchTerm: string;
  facultyFilter: string;
  classFilter: string;
  statusFilter: string;
}

export const useSearch = (initialState: Partial<SearchState> = {}) => {
  const [searchState, setSearchState] = useState<SearchState>({
    searchTerm: '',
    facultyFilter: '',
    classFilter: '',
    statusFilter: '',
    ...initialState
  });

  const updateSearch = (updates: Partial<SearchState>) => {
    setSearchState(prev => ({ ...prev, ...updates }));
  };

  const clearSearch = () => {
    setSearchState({
      searchTerm: '',
      facultyFilter: '',
      classFilter: '',
      statusFilter: ''
    });
  };

  return {
    searchState,
    updateSearch,
    clearSearch
  };
};
