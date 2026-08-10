import { useState, useMemo } from "react";
import { useMutation } from "@tanstack/react-query";
import { useReferenceData } from "../context/ReferenceDataContext";
import { createDocumentRequest } from "../services/api";
import { DOC_TYPE_MAP, CERTIFICATION_MAP } from "../utils/constants";
import {
  ALUMNI_ACCESS_IDS,
  validateProfileStep,
  validateRequestDetailsStep,
  validateTORStep,
  validateReceiptStep,
} from "../utils/alumniRequestUtils";

export const useAlumniRequest = ({ showProfileStep = false }) => {
  const {
    documentTypes,
    certifications,
    purposes: referencePurposes,
    docTypeName,
    certName,
  } = useReferenceData();

  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const availableDocs = useMemo(() => {
    return documentTypes.filter((doc) => ALUMNI_ACCESS_IDS.includes(doc.access_id));
  }, [documentTypes]);

  const availableCertifications = useMemo(() => {
    return certifications.filter((cert) => ALUMNI_ACCESS_IDS.includes(cert.access_id));
  }, [certifications]);

  const availablePurposes = referencePurposes;

  const [formData, setFormData] = useState({
    termsAgreed: false,
    firstName: "",
    middleName: "",
    surname: "",
    dob: "",
    address: "",
    contactNumber: "",
    documentsRequested: [],
    purposeOfRequest: "",
    certification: [],
    noRequests: false,
    doneRequest: false,
    receiptNumber: "",
    dateOfPayment: "",
    documentCopies: {},
    certCopies: {},
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    // MultiSelect dropdowns and Dropdowns pass name/value via custom events or targets
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCheckboxChange = (e) => {
    const { name, checked } = e.target;
    setFormData((prev) => {
      if (name === "noRequests") {
        return {
          ...prev,
          noRequests: checked,
          doneRequest: checked ? false : prev.doneRequest,
        };
      }
      if (name === "doneRequest") {
        return {
          ...prev,
          doneRequest: checked,
          noRequests: checked ? false : prev.noRequests,
        };
      }
      return { ...prev, [name]: checked };
    });
  };

  const handleCertCopyChange = (certName, value) => {
    setFormData((prev) => ({
      ...prev,
      certCopies: {
        ...prev.certCopies,
        [certName]: value,
      },
    }));
  };

  const handleDocCopyChange = (docName, value) => {
    setFormData((prev) => ({
      ...prev,
      documentCopies: {
        ...prev.documentCopies,
        [docName]: value,
      },
    }));
  };

  const hasTOR = formData.documentsRequested.some(
    (doc) => doc.toLowerCase().includes("tor") || doc.toLowerCase().includes("transcript")
  );

  const showCertificationDropdown = formData.documentsRequested.some((doc) => {
    return doc.toLowerCase().includes("certif");
  });

  const finalStep = showProfileStep ? (hasTOR ? 5 : 4) : (hasTOR ? 4 : 3);

  const nextStep = (e) => {
    if (e) e.preventDefault();
    setErrorMessage("");

    if (currentStep === 1 && !formData.termsAgreed) {
      setErrorMessage("You must read and agree to the Terms & Conditions to proceed.");
      return;
    }

    if (showProfileStep && currentStep === 2) {
      const profileError = validateProfileStep(formData);
      if (profileError) {
        setErrorMessage(profileError);
        return;
      }
    }

    if (currentStep === (showProfileStep ? 3 : 2)) {
      const detailsError = validateRequestDetailsStep(formData, showCertificationDropdown);
      if (detailsError) {
        setErrorMessage(detailsError);
        return;
      }
    }

    if (currentStep === (showProfileStep ? 4 : 3) && hasTOR) {
      const torError = validateTORStep(formData, hasTOR);
      if (torError) {
        setErrorMessage(torError);
        return;
      }
    }

    if (currentStep < finalStep) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = (e) => {
    if (e) e.preventDefault();
    setErrorMessage("");
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handlePreSubmit = (e) => {
    if (e) e.preventDefault();
    setErrorMessage("");

    const receiptError = validateReceiptStep(formData);
    if (receiptError) {
      setErrorMessage(receiptError);
      return;
    }

    setShowConfirmModal(true);
  };

  const mutation = useMutation({
    mutationFn: createDocumentRequest,
    onSuccess: () => {
      setIsSubmitted(true);
    },
    onError: (error) => {
      console.error("Submission error:", error.response?.data || error);
      setErrorMessage(
        error.response?.data?.message || "Submission failed. Please check your data."
      );
    },
  });

  const handleSubmit = (e) => {
    if (e) e.preventDefault();

    const selectedPurpose = availablePurposes.find(
      (p) => p.purpose_name === formData.purposeOfRequest
    );
    const purposeId =
      selectedPurpose?.request_purpose_id ??
      referencePurposes.find((p) => p.purpose_name === formData.purposeOfRequest)
        ?.request_purpose_id;

    // Map all selected certification names to their IDs
    const certificates = formData.certification
      .map((name) => ({
        certificate_type_id: availableCertifications.find((c) => c.certificate_name === name)
          ?.certificate_type_id,
        number_of_copies: parseInt(formData.certCopies[name]) || 1,
      }))
      .filter((c) => c.certificate_type_id);

    const payload = {
      request_purpose_id: purposeId,
      or_number: formData.receiptNumber,
      receipt_date: formData.dateOfPayment,
      documents: formData.documentsRequested
        .filter((name) => !name.toLowerCase().includes("certif"))
        .map((name) => {
          const dbDoc = availableDocs.find((d) => d.document_name === name);
          const id =
            dbDoc?.document_type_id ??
            Object.keys(DOC_TYPE_MAP).find((key) => docTypeName(key) === name);
          return {
            document_type_id: id,
            number_of_copies: parseInt(formData.documentCopies[name]) || 1,
          };
        })
        .filter((doc) => doc.document_type_id),
      certificates: certificates,
    };

    mutation.mutate(payload);
  };

  const handleConfirm = () => {
    setIsSubmitted(false);
    setCurrentStep(1);
    setFormData({
      termsAgreed: false,
      firstName: "",
      middleName: "",
      surname: "",
      dob: "",
      address: "",
      contactNumber: "",
      documentsRequested: [],
      purposeOfRequest: "",
      certification: [],
      noRequests: false,
      doneRequest: false,
      receiptNumber: "",
      dateOfPayment: "",
      documentCopies: {},
      certCopies: {},
    });
    setErrorMessage("");
    mutation.reset();
  };

  const isLoading = mutation.isPending;

  const certificationOptions =
    availableCertifications.length > 0
      ? availableCertifications.map((c) => c.certificate_name)
      : Object.values(CERTIFICATION_MAP);

  const purposeOptions =
    availablePurposes.length > 0
      ? availablePurposes.map((p) => p.purpose_name)
      : referencePurposes.map((p) => p.purpose_name);

  const documentOptions =
    availableDocs.length > 0
      ? availableDocs.map((d) => d.document_name)
      : Object.values(DOC_TYPE_MAP);

  const stepLabels = showProfileStep
    ? hasTOR
      ? [
          "Terms & Conditions",
          "Alumni Profile",
          "Alumni Request",
          "TOR Requirements",
          "Payment and Document Details",
        ]
      : [
          "Terms & Conditions",
          "Alumni Profile",
          "Alumni Request",
          "Payment and Document Details",
        ]
    : hasTOR
    ? [
        "Terms & Conditions",
        "Alumni Request",
        "TOR Requirements",
        "Payment and Document Details",
      ]
    : [
        "Terms & Conditions",
        "Alumni Request",
        "Payment and Document Details",
      ];

  const totalSteps = stepLabels.length;

  const certificationLabel = formData.certification.join(", ");

  return {
    currentStep,
    isSubmitted,
    errorMessage,
    setErrorMessage,
    showConfirmModal,
    setShowConfirmModal,
    formData,
    handleInputChange,
    handleCheckboxChange,
    handleCertCopyChange,
    handleDocCopyChange,
    nextStep,
    prevStep,
    handlePreSubmit,
    handleSubmit,
    handleConfirm,
    isLoading,
    availableDocs,
    availableCertifications,
    certificationOptions,
    purposeOptions,
    documentOptions,
    stepLabels,
    totalSteps,
    hasTOR,
    showCertificationDropdown,
    certificationLabel,
    finalStep,
  };
};
