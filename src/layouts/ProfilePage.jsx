import React, { useState } from 'react';
import FieldGroup from '../components/FieldGroup'; 
import { UserIcon } from '@heroicons/react/24/solid';
import { PencilSquareIcon, XMarkIcon } from '@heroicons/react/24/outline';

// CHANGE IF NEEDED: Configuration for different user roles
const ROLE_CONFIG = {
  student: {
    sectionTitle: "Student Details",
    idLabel: "Student Number ID #",
    idPattern: "^\\d{4}-\\d{5}-TG-\\d$", 
    idError: "Format must be YYYY-XXXXX-TG-X"
  },
  staff: {
    sectionTitle: "Staff Information",
    idLabel: "Employee Number",
    idPattern: "^EMP-\\d{4}-\\d{3}$", 
    idError: "Format must be EMP-YYYY-XXX"
  },
  alumni: {
    sectionTitle: "Alumni Record",
    idLabel: "Student Number ID #",
    idPattern: "^\\d{4}-\\d{5}-TG-\\d$", 
    idError: "Format must be YYYY-XXXXX-TG-X"
  }
};

const ProfilePage = ({ userType = "student" }) => {
  
  const config = ROLE_CONFIG[userType];

  const [isEditing, setIsEditing] = useState(false);

  // Initialize Data - NEED BACKEND INTEGRATION
  const [profileData, setProfileData] = useState({
    firstName: "Juan",
    middleName: "Dela",
    lastName: "Cruz",
    studentId: userType === 'staff' ? 'EMP-2023-001' : (userType === 'alumni' ? 'ALU-54321' : '2023-10049-TG-1'),
    email: "juan.cruz@pup.edu.ph"
  });

  const [editData, setEditData] = useState(profileData);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditData({
      ...editData,
      [name]: value
    });
  };

  const toggleEdit = () => {
    if (isEditing) {
      setEditData(profileData);
    }
    setIsEditing(!isEditing);
  };

  const handleSave = (e) => {
    e.preventDefault();
    setProfileData(editData);
    setIsEditing(false);
    alert(`${userType.toUpperCase()} Profile Saved Successfully!`);
  };

  const handleLogout = () => {
    if (window.confirm("Are you sure you want to logout?")) {
      alert("Logging out...");
    }
  };

  const handleDelete = () => {
    if (window.confirm("WARNING: Are you sure you want to PERMANENTLY delete your account?")) {
      alert("Account deletion request sent to server.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center font-sans">
      <div className="w-full max-w-7xl bg-pup-dark-maroon shadow-2xl overflow-hidden flex flex-col relative rounded-sm min-h-[700px]">
        
        <div className="h-3 w-full bg-[#eebc48]"></div>

        {/* --- HEADER --- */}
        <div className="px-8 py-10">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6 flex-1">
            <div className="flex flex-col md:flex-row items-center md:items-start gap-6 w-full">
              <div className="w-24 h-24 rounded-full bg-[#222222] flex items-center justify-center shrink-0 border-2 border-[#4a1010] overflow-hidden">
                <UserIcon className="text-gray-400 h-16 w-16 translate-y-2" />
              </div>

              <div className="text-white space-y-1 mt-2 text-center md:text-left">
                <h2 className="text-3xl font-bold tracking-wide flex flex-wrap gap-3 justify-center md:justify-start">
                  <span>{profileData.firstName}</span>
                  <span>{profileData.middleName}</span>
                  <span>{profileData.lastName}</span>
                </h2>
                {/* Dynamic ID Display */}
                <p className="text-sm font-medium opacity-90">{profileData.studentId}</p>
                <p className="text-sm font-medium opacity-90">{profileData.email}</p>
                
                {/* Role Badge */}
                <span className="inline-block px-2 py-0.5 rounded bg-[#eebc48] text-[#4a1010] text-xs font-bold uppercase tracking-wider mt-1">
                  {userType}
                </span>
              </div>
            </div>

            <button 
              onClick={toggleEdit}
              className="group flex items-center gap-2 text-white hover:text-[#eebc48] transition-colors self-end md:self-start shrink-0 whitespace-nowrap"
            >
              <span className="underline underline-offset-4 decoration-1">
                {isEditing ? "Cancel Edit" : "Edit Profile"}
              </span>
              {isEditing ? (
                 <XMarkIcon className="h-5 w-5" />
              ) : (
                 <PencilSquareIcon className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>

        <div className="w-full px-8">
            <div className="h-0.5 w-full bg-white"></div>
        </div>

        {/* --- FORM SECTION --- */}
        <div className="p-8 flex-grow flex flex-col">
          <h3 className="text-3xl font-bold text-white text-center mb-8 tracking-wide uppercase">
            {isEditing ? `Edit ${config.sectionTitle}` : config.sectionTitle}
          </h3>

          <form onSubmit={handleSave} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              <FieldGroup 
                label="First Name" 
                name="firstName" 
                value={isEditing ? editData.firstName : profileData.firstName} 
                isEditing={isEditing} 
                onChange={handleInputChange} 
                required
              />
              <FieldGroup 
                label="Middle Name" 
                name="middleName" 
                value={isEditing ? editData.middleName : profileData.middleName} 
                isEditing={isEditing} 
                onChange={handleInputChange} 
                required
              />
              <FieldGroup 
                label="Last Name" 
                name="lastName" 
                value={isEditing ? editData.lastName : profileData.lastName} 
                isEditing={isEditing} 
                onChange={handleInputChange} 
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
              
              {/* DYNAMIC FIELD: Label and Validation change based on 'userType' */}
              <FieldGroup 
                label={config.idLabel} 
                name="studentId" 
                value={isEditing ? editData.studentId : profileData.studentId} 
                isEditing={isEditing} 
                onChange={handleInputChange} 
                pattern={config.idPattern}
                title={config.idError}
                required
              />
              
              <FieldGroup 
                label="Email Address" 
                name="email" 
                value={isEditing ? editData.email : profileData.email} 
                isEditing={isEditing} 
                onChange={handleInputChange} 
                type="email"
                pattern="[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$"
                title="Please enter a valid email address"
                required
              />
              
              <div className="w-full h-[74px] flex items-end">
                {isEditing && (
                  <button 
                    type="submit"
                    className="w-full bg-[#eebc48] hover:bg-[#d4a53b] text-white font-bold py-2.5 rounded shadow-md transition-colors text-lg"
                  >
                    Save Changes
                  </button>
                )}
              </div>
            </div>
          </form>
        </div>

        <div className="px-8 pb-8 pt-4 mt-auto flex justify-between items-center">
          <button 
            onClick={handleDelete}
            className="bg-[#eebc48] hover:bg-[#d4a53b] text-white font-bold py-2 px-6 rounded shadow-md transition-colors"
          >
            Delete Account
          </button>
          
          <button 
            onClick={handleLogout}
            className="bg-[#eebc48] hover:bg-[#d4a53b] text-white font-bold py-2 px-8 rounded shadow-md transition-colors"
          >
            Logout
          </button>
        </div>

      </div>
    </div>
  );
};

export default ProfilePage;