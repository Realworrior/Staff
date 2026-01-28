import { useParams } from 'react-router-dom';
import { Mail, Phone, MapPin, Building, Calendar, FileText, Download, User } from 'lucide-react';

export const EmployeeProfile = () => {
    const { id } = useParams();

    // Mock data fetching based on ID
    const employee = {
        id,
        name: 'Sarah Wilson',
        role: 'Senior Project Manager',
        department: 'Operations',
        email: 'sarah.wilson@company.com',
        phone: '+1 (555) 123-4567',
        location: 'New York, NY',
        joinDate: 'March 15, 2022',
        status: 'Active',
        avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150&h=150',
        documents: [
            { name: 'Employment Contract.pdf', date: 'Mar 15, 2022' },
            { name: 'Tax Declaration 2024.pdf', date: 'Jan 10, 2024' },
            { name: 'Performance Review Q4.pdf', date: 'Dec 20, 2023' },
        ]
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Header Profile Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                <div className="flex flex-col md:flex-row gap-8 items-start">
                    <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-gray-50 shadow-md flex-shrink-0">
                        <img src={employee.avatar} alt={employee.name} className="w-full h-full object-cover" />
                    </div>

                    <div className="flex-1 space-y-4">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">{employee.name}</h1>
                            <p className="text-lg text-indigo-600 font-medium">{employee.role}</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex items-center gap-3 text-gray-600">
                                <Building size={18} className="text-gray-400" />
                                <span>{employee.department}</span>
                            </div>
                            <div className="flex items-center gap-3 text-gray-600">
                                <MapPin size={18} className="text-gray-400" />
                                <span>{employee.location}</span>
                            </div>
                            <div className="flex items-center gap-3 text-gray-600">
                                <Mail size={18} className="text-gray-400" />
                                <span>{employee.email}</span>
                            </div>
                            <div className="flex items-center gap-3 text-gray-600">
                                <Phone size={18} className="text-gray-400" />
                                <span>{employee.phone}</span>
                            </div>
                            <div className="flex items-center gap-3 text-gray-600">
                                <Calendar size={18} className="text-gray-400" />
                                <span>Joined {employee.joinDate}</span>
                            </div>
                            <div className="flex items-center gap-3 text-gray-600">
                                <User size={18} className="text-gray-400" />
                                <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full font-medium">
                                    {employee.status}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Documents Section */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Documents</h2>
                <div className="space-y-3">
                    {employee.documents.map((doc, index) => (
                        <div key={index} className="flex items-center justify-between p-4 border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg">
                                    <FileText size={20} />
                                </div>
                                <div>
                                    <p className="font-medium text-gray-900">{doc.name}</p>
                                    <p className="text-sm text-gray-500">Uploaded on {doc.date}</p>
                                </div>
                            </div>
                            <button className="text-gray-400 hover:text-indigo-600 transition-colors">
                                <Download size={20} />
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
