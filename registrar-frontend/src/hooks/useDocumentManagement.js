import { useState } from "react";
import {
  createDocumentType,
  updateDocumentType,
  deleteDocumentType,
  createCertification,
  updateCertification,
  deleteCertification,
} from "../services/api";
import {
  ACCESS_MAP,
  ACCESS_MAP_REVERSE,
  EMPTY_FORM,
  validateProcessPeriod,
  extractApiResponseData,
} from "../utils/documentManagementUtils";

export const useDocumentManagement = ({
  documents,
  setDocuments,
  certifications,
  setCertifications,
  onArchiveDoc,
  onArchiveCert,
}) => {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [selectedType, setSelectedType] = useState("document"); // "document" or "certificate"
  const [form, setForm] = useState(EMPTY_FORM);
  const [isAdding, setIsAdding] = useState(true);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, docId: null, type: "document" });
  const [deleteLoading, setDeleteLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    // Checkbox inputs (requires_source_submission's toggle) carry their
    // value in .checked, not .value — everything else keeps using .value.
    setForm((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  };

  const handleVoiceTextareaChange = (name) => (value) => {
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleEditDoc = (doc) => {
    setSelected(doc);
    setSelectedType("document");
    setIsAdding(false);
    setForm({
      document_name: doc.document_name,
      document_description: doc.document_description ?? "",
      document_requirements: doc.document_requirements ?? "",
      document_process_period: doc.document_process_period ?? "",
      access_id: ACCESS_MAP_REVERSE[doc.access_id] ?? doc.access_id,
      logbook_category_id: doc.logbook_category_id ?? "",
      requires_source_submission: Boolean(doc.requires_source_submission),
      fulfillment_track_id: doc.fulfillment_track_id ?? "",
    });
  };

  const handleEditCert = (cert) => {
    setSelected(cert);
    setSelectedType("certificate");
    setIsAdding(false);
    setForm({
      document_name: cert.certificate_name,
      document_description: "",
      document_requirements: cert.certificate_requirements ?? "",
      document_process_period: cert.certificate_process_period ?? "",
      access_id: ACCESS_MAP_REVERSE[cert.access_id] ?? cert.access_id,
      logbook_category_id: cert.logbook_category_id ?? "",
      requires_source_submission: Boolean(cert.requires_source_submission),
      fulfillment_track_id: cert.fulfillment_track_id ?? "",
    });
  };

  const handleAddDoc = () => {
    setSelected(null);
    setSelectedType("document");
    setIsAdding(true);
    setForm(EMPTY_FORM);
  };

  const handleAddCert = () => {
    setSelected(null);
    setSelectedType("certificate");
    setIsAdding(true);
    setForm(EMPTY_FORM);
  };

  const handleCancel = () => {
    setSelected(null);
    setIsAdding(true);
    setForm(EMPTY_FORM);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    // Validate Document/Certificate Name
    if (!form.document_name || !form.document_name.trim()) {
      const fieldName = selectedType === "document" ? "Document Name" : "Certificate Name";
      setErrorMsg(`${fieldName} is required.`);
      return;
    }

    // Validate Document Description (only for document type)
    if (selectedType === "document" && (!form.document_description || !form.document_description.trim())) {
      setErrorMsg("Document Description is required.");
      return;
    }

    // Validate List of Requirements
    if (!form.document_requirements || !form.document_requirements.trim()) {
      setErrorMsg("List of Requirements is required.");
      return;
    }

    // Validate Process Period via utility validation logic
    if (!validateProcessPeriod(form.document_process_period)) {
      setErrorMsg("Process Period must be a whole number between 1 and 30 working days.");
      return;
    }

    // Validate Exclusive For
    if (!form.access_id) {
      setErrorMsg("Exclusive For is required.");
      return;
    }

    // logbook_category_id is nullable — "" from an unselected dropdown
    // must become null (not the string ""), or the exists:logbook_category
    // validation rule on the backend rejects it. Shared by both branches
    // below since both payloads carry this field.
    const normalizedLogbookCategoryId =
      form.logbook_category_id === "" || form.logbook_category_id === null
        ? null
        : Number(form.logbook_category_id);

    // Same nullability handling as logbook_category_id above —
    // fulfillment_track_id is the field that actually enables Phase 3
    // claim-ticket grouping (see RequestReleaseGroupService::
    // assignReleaseGroups()); "" from an unselected dropdown means
    // "standard track" (null), not an invalid value.
    const normalizedFulfillmentTrackId =
      form.fulfillment_track_id === "" || form.fulfillment_track_id === null
        ? null
        : Number(form.fulfillment_track_id);

    try {
      if (selectedType === "document") {
        const payload = {
          ...form,
          access_id: ACCESS_MAP[form.access_id] ?? form.access_id,
          logbook_category_id: normalizedLogbookCategoryId,
          requires_source_submission: Boolean(form.requires_source_submission),
          fulfillment_track_id: normalizedFulfillmentTrackId,
        };
        if (isAdding) {
          const res = await createDocumentType(payload);
          const freshData = extractApiResponseData(res);
          setDocuments((prev) => [...prev, freshData]);
          setSuccessMsg("Document added successfully!");
        } else if (selected) {
          const res = await updateDocumentType(selected.document_type_id, payload);
          const freshData = extractApiResponseData(res);
          setDocuments((prev) =>
            prev.map((d) => d.document_type_id === selected.document_type_id ? freshData : d)
          );
          setSuccessMsg("Document updated successfully!");
        }
      } else {
        const payload = {
          certificate_name: form.document_name,
          certificate_requirements: form.document_requirements,
          certificate_process_period: form.document_process_period,
          access_id: ACCESS_MAP[form.access_id] ?? form.access_id,
          logbook_category_id: normalizedLogbookCategoryId,
          requires_source_submission: Boolean(form.requires_source_submission),
          fulfillment_track_id: normalizedFulfillmentTrackId,
        };
        if (isAdding) {
          const res = await createCertification(payload);
          const freshData = extractApiResponseData(res);
          setCertifications((prev) => [...prev, freshData]);
          setSuccessMsg("Certificate added successfully!");
        } else if (selected) {
          const res = await updateCertification(selected.certificate_type_id, payload);
          const freshData = extractApiResponseData(res);
          setCertifications((prev) =>
            prev.map((c) => c.certificate_type_id === selected.certificate_type_id ? freshData : c)
          );
          setSuccessMsg("Certificate updated successfully!");
        }
      }
      setForm(EMPTY_FORM);
      setSelected(null);
      setIsAdding(true);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || "An unexpected error occurred.");
    }
  };

  const confirmDelete = (id, type) => {
    setDeleteModal({ isOpen: true, docId: id, type });
  };

  const handleDelete = async (id) => {
    setDeleteLoading(true);
    try {
      if (deleteModal.type === "document") {
        await deleteDocumentType(id);
        setDocuments((prev) => prev.filter((d) => d.document_type_id !== id));
        if (selected?.document_type_id === id && selectedType === "document") {
          handleCancel();
        }
        setSuccessMsg("Document deleted successfully!");
      } else {
        await deleteCertification(id);
        setCertifications((prev) => prev.filter((c) => c.certificate_type_id !== id));
        if (selected?.certificate_type_id === id && selectedType === "certificate") {
          handleCancel();
        }
        setSuccessMsg("Certificate deleted successfully!");
      }
      setDeleteModal({ isOpen: false, docId: null, type: "document" });
    } catch (err) {
      setErrorMsg(err.response?.data?.message || "Failed to delete.");
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleArchiveDocIntercept = async (docId) => {
    await onArchiveDoc(docId);
    if (selected?.document_type_id === docId && selectedType === "document") {
      handleCancel();
    }
  };

  const handleArchiveCertIntercept = async (certId) => {
    await onArchiveCert(certId);
    if (selected?.certificate_type_id === certId && selectedType === "certificate") {
      handleCancel();
    }
  };

  return {
    search,
    setSearch,
    selected,
    selectedType,
    form,
    setForm,
    isAdding,
    successMsg,
    setSuccessMsg,
    errorMsg,
    setErrorMsg,
    deleteModal,
    setDeleteModal,
    deleteLoading,
    handleChange,
    handleVoiceTextareaChange,
    handleEditDoc,
    handleEditCert,
    handleAddDoc,
    handleAddCert,
    handleCancel,
    handleSave,
    confirmDelete,
    handleDelete,
    handleArchiveDoc: handleArchiveDocIntercept,
    handleArchiveCert: handleArchiveCertIntercept,
  };
};