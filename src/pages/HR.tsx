import { useState } from 'react';
import { Search, Filter, Plus, Mail, MoreVertical, Building } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const HR = () => {
    const { users, selectedBranch } = useAuth();
    const [searchTerm, setSearchTerm] = useState('');

    const filteredEmployees = users
        .filter(u => u.branch === selectedBranch)
        .filter(emp =>
            emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            emp.role.toLowerCase().includes(searchTerm.toLowerCase())
        );

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Employee Directory</h1>
                    <p className="text-gray-500">Manage your team members and roles</p>
                </div>
                <button className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-indigo-700 transition-colors shadow-sm">
                    <Plus size={20} />
                    <span>Add Employee</span>
                </button>
            </div>

            {/* Search and Filter */}
            <div className="flex flex-col md:flex-row gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                        type="text"
                        placeholder="Search employees by name, role, or branch..."
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <button className="flex items-center gap-2 px-4 py-2 text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50">
                    <Filter size={20} />
                    <span>Filters</span>
                </button>
            </div>

            {/* Employee List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredEmployees.map((employee) => (
                    <div key={employee.id} className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                        <div className="p-6">
                            <div className="flex justify-between items-start">
                                <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-white shadow-sm">
                                    <img
                                        src={employee.avatar}
                                        alt={employee.name}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                                <button className="text-gray-400 hover:text-gray-600">
                                    <MoreVertical size={20} />
                                </button>
                            </div>

                            <div className="mt-4">
                                <h3 className="text-lg font-bold text-gray-900">{employee.name}</h3>
                                <p className="text-indigo-600 font-medium">{employee.role}</p>
                            </div>

                            <div className="mt-6 space-y-3">
                                <div className="flex items-center gap-3 text-gray-500 text-sm">
                                    <Building size={16} />
                                    <span>{employee.branch || 'Main Office'}</span>
                                </div>
                                <div className="flex items-center gap-3 text-gray-500 text-sm">
                                    <Mail size={16} />
                                    <span>{employee.username}@company.com</span>
                                </div>
                            </div>
                        </div>

                        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-700/50 rounded-b-xl flex justify-between items-center">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                                Active
                            </span>
                            <Link
                                to={`/hr/${employee.id}`}
                                className="text-sm font-medium text-indigo-600 hover:text-indigo-800 dark:text-indigo-400"
                            >
                                View Profile
                            </Link>
                        </div>
                    </div>
                ))}
                {filteredEmployees.length === 0 && (
                    <div className="col-span-full py-12 text-center text-gray-500">
                        No employees found matching your search in this branch.
                    </div>
                )}
            </div>
        </div>
    );
};
