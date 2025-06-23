import { useState, useEffect } from 'react';
import {
  CogIcon,
  MoonIcon,
  SunIcon,
  TrashIcon,
  ExclamationTriangleIcon,
  CheckIcon
} from '@heroicons/react/24/outline';
import { useApp } from '../contexts/AppContext';

export function Settings() {
  const { state, actions } = useApp();
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('darkMode') === 'true';
  });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteSuccess, setDeleteSuccess] = useState(false);

  // Apply dark mode to document
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('darkMode', darkMode.toString());
  }, [darkMode]);

  const handleDeleteAll = async () => {
    try {
      // Delete all schemas
      const deletePromises = state.schemas.map(schema =>
        fetch(`http://localhost:3001/api/schemas/${schema.id}`, {
          method: 'DELETE'
        })
      );

      await Promise.all(deletePromises);

      // Refresh the schemas list
      await actions.refreshData();

      setShowDeleteConfirm(false);
      setDeleteSuccess(true);

      // Hide success message after 3 seconds
      setTimeout(() => setDeleteSuccess(false), 3000);
    } catch (error) {
      console.error('Failed to delete schemas:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <CogIcon className="h-8 w-8 text-gray-600 dark:text-gray-400" />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
      </div>

      {/* Success Message */}
      {deleteSuccess && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <CheckIcon className="h-5 w-5 text-green-600 dark:text-green-400" />
            <p className="text-green-800 dark:text-green-200">All schemas have been successfully deleted!</p>
          </div>
        </div>
      )}

      {/* Appearance Settings */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Appearance</h2>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {darkMode ? (
                <MoonIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              ) : (
                <SunIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              )}
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Dark Mode</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Toggle between light and dark themes</p>
              </div>
            </div>
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                darkMode ? 'bg-primary-600' : 'bg-gray-200 dark:bg-gray-700'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  darkMode ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Data Management */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Data Management</h2>
        <div className="space-y-4">
          <div className="p-4 border border-red-200 dark:border-red-800 rounded-lg bg-red-50 dark:bg-red-900/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <ExclamationTriangleIcon className="h-5 w-5 text-red-600 dark:text-red-400" />
                <div>
                  <p className="font-medium text-red-900 dark:text-red-200">Delete All Schemas</p>
                  <p className="text-sm text-red-700 dark:text-red-300">
                    Remove all {state.schemas.length} discovered schemas. This action cannot be undone.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                disabled={state.schemas.length === 0}
                className="btn-danger disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <TrashIcon className="mr-2 h-4 w-4" />
                Delete All
              </button>
            </div>
          </div>

          {/* Schema Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Schemas</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{state.schemas.length}</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">REST APIs</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {state.schemas.filter(s => s.protocol === 'rest').length}
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">WebSocket APIs</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {state.schemas.filter(s => s.protocol === 'websocket').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center space-x-3 mb-4">
              <ExclamationTriangleIcon className="h-6 w-6 text-red-600 dark:text-red-400" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Confirm Deletion</h3>
            </div>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Are you sure you want to delete all {state.schemas.length} schemas? This action cannot be undone and will remove all discovered API schemas from your collection.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="btn-outline flex-1"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAll}
                className="btn-danger flex-1"
              >
                Delete All {state.schemas.length} Schemas
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
