import { useState } from 'react';
import { Search, Filter, Plus, Mail, Phone, MoreVertical, MapPin, Building } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Employee {
    id: string;
    name: string;
    role: string;
    department: string;
    email: string;
    phone: string;
    location: string;
    status: 'active' | 'on_be leave' | 'terminated';
    avatar: string;
}

const MOCK_EMPLOYEES: Employee[] = [
    {
        id: '1',
        name: 'Sarah Wilson',
        role: 'Senior Project Manager',
        department: 'Operations',
        email: 'sarah.wilson@company.com',
        phone: '+1 (555) 123-4567',
        location: 'New York, NY',
        status: 'active',
        avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150&h=150',
    },
    {
        id: '2',
        name: 'Mike Chen',
        role: 'Lead Developer',
        department: 'Engineering',
        email: 'mike.chen@company.com',
        phone: '+1 (555) 234-5678',
        location: 'San Francisco, CA',
        status: 'active',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150&h=150',
    },
    {
        id: '3',
        name: 'Emma Davis',
        role: 'UX Designer',
        department: 'Design',
        email: 'emma.davis@company.com',
        phone: '+1 (555) 345-6789',
        location: 'London, UK',
        status: 'on_be leave',
        avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=150&h=150',
    },
    {
        id: '4',
        name: 'James Wilson',
        role: 'Sales Director',
        department: 'Sales',
        email: 'james.wilson@company.com',
        phone: '+1 (555) 456-7890',
        location: 'Chicago, IL',
        status: 'active',
        avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=150&h=150',
    },
];

export const HR = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [employees] = useState<Employee[]>(MOCK_EMPLOYEES);

    const filteredEmployees = employees.filter(emp =>
        emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.department.toLowerCase().includes(searchTerm.toLowerCase())
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
                        placeholder="Search employees by name, role, or department..."
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
                                    <span>{employee.department}</span>
                                </div>
                                <div className="flex items-center gap-3 text-gray-500 text-sm">
                                    <MapPin size={16} />
                                    <span>{employee.location}</span>
                                </div>
                                <div className="flex items-center gap-3 text-gray-500 text-sm">
                                    <Mail size={16} />
                                    <span>{employee.email}</span>
                                </div>
                                <div className="flex items-center gap-3 text-gray-500 text-sm">
                                    <Phone size={16} />
                                    <span>{employee.phone}</span>
                                </div>
                            </div>
                        </div>

                        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 rounded-b-xl flex justify-between items-center">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize
                ${employee.status === 'active' ? 'bg-green-100 text-green-800' :
                                    employee.status === 'on_be leave' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'}`}>
                                {employee.status.replace('_', ' ')}
                            </span>
                            <Link
                                to={`/hr/${employee.id}`}
                                className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
                            >
                                View Profile
                            </Link>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
