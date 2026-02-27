import React, { useState, useEffect } from 'react';
import FieldGroup from '../components/FieldGroup'; 
import { UserIcon } from '@heroicons/react/24/solid';
import ConfirmationModal from '../components/ConfirmationModal';
import { useAuth } from '../context/AuthProvider';

const ROLE_CONFIG = {
  student: {
    sectionTitle: "Student Details",
    idLabel: "Student Number ID #",
  },
  staff: {
    sectionTitle: "Staff Information",
    idLabel: "Employee Number",
  },
  alumni: {
    sectionTitle: "Alumni Record",
    idLabel: "Student Number ID #", 
  }
};

const ProfilePage = ({ userType = "student" }) => {

  const { user } = useAuth();
  const config = ROLE_CONFIG[userType];

  const [profileData, setProfileData] = useState({
    firstName: "",
    middleName: "",
    lastName: "",
    suffix: "",
    studentId: "",
    email: ""
  });

  useEffect(() => {
    if (!user) return;

    if (user.role_id === 1 && user.student_profile) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setProfileData({
        firstName: user.student_profile.first_name || "",
        middleName: user.student_profile.middle_name || "",
        lastName: user.student_profile.last_name || "",
        suffix: user.student_profile.suffix || "",
        studentId: user.academic_record.student_number || "",
        email: user.email || ""
      });
    }

    else if (user.role_id === 3) {
      setProfileData({
        firstName: "",
        middleName: "",
        lastName: "",
        suffix: "",
        studentId: "N/A",
        email: user.email || ""
      });
    }

    else if (user.role_id === 2) {
      setProfileData({
        firstName: "",
        middleName: "",
        lastName: "",
        suffix: "",
        studentId: "N/A",
        email: user.email || ""
      });
    }

  }, [user]);

  const [modal, setModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'default',
    onConfirm: () => {},
  });

  const closeModal = () => {
    setModal(prev => ({ ...prev, isOpen: false }));
  };


  return (
    <div className="min-h-screen flex items-start justify-center font-sans py-2 lg:-mt-5">
      <div className="w-full max-w-7xl bg-pup-dark-maroon shadow-2xl overflow-hidden flex flex-col relative rounded-sm min-h-[630px]">
        
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

          </div>
        </div>

        <div className="w-full px-8">
            <div className="h-0.5 w-full bg-white"></div>
        </div>

        <div className="p-8 flex-grow flex flex-col">
          <h3 className="text-3xl font-bold text-white text-center mb-8 tracking-wide uppercase">
            {config.sectionTitle}
          </h3>

          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              <FieldGroup 
                label="First Name" 
                name="firstName" 
                value={profileData.firstName} 
                isEditing={false} 
                required
              />
              <FieldGroup 
                label="Middle Name" 
                name="middleName" 
                value={profileData.middleName} 
                isEditing={false} 
                required
              />
              <FieldGroup 
                label="Last Name" 
                name="lastName" 
                value={profileData.lastName} 
                isEditing={false} 
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
              
              {/* DYNAMIC FIELD: Label and Validation change based on 'userType' */}
              <FieldGroup 
                label={config.idLabel} 
                name="studentId" 
                value={profileData.studentId} 
                isEditing={false} 
                required
              />
              
              <FieldGroup 
                label="Email Address" 
                name="email" 
                value={profileData.email} 
                isEditing={false} 
                type="email"
                pattern="[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$"
                title="Please enter a valid email address"
                required
              />
              <FieldGroup 
                label="Suffix" 
                name="suffix" 
                value={profileData.suffix} 
                isEditing={false} 
                placeholder="e.g. Jr., Sr., III (Optional)"
                type="text"
              />
            </div>
          </div>
        </div>
          <ConfirmationModal
            isOpen={modal.isOpen}
            onClose={closeModal}
            onConfirm={modal.onConfirm}
            title={modal.title}
            message={modal.message}
            type={modal.type}
          />
      </div>
    </div>
  );
};

export default ProfilePage;