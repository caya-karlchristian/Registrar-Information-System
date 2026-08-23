import { useEffect, useCallback, useRef } from 'react';

/**
 * Checks whether form data has meaningful user-entered content to justify drafting.
 */
const hasMeaningfulData = (formData, currentStep) => {
  if (currentStep > 1) return true;
  if (!formData || typeof formData !== 'object') return false;

  if (formData.receiptNumber && String(formData.receiptNumber).trim() !== '') return true;
  if (Array.isArray(formData.documentsRequested) && formData.documentsRequested.length > 0) return true;
  if (Array.isArray(formData.certification) && formData.certification.length > 0) return true;
  if (formData.firstName && String(formData.firstName).trim() !== '') return true;
  if (formData.surname && String(formData.surname).trim() !== '') return true;
  if (formData.contactNumber && String(formData.contactNumber).trim() !== '') return true;
  if (formData.purposeOfRequest && String(formData.purposeOfRequest).trim() !== '') return true;

  return false;
};

/**
 * useFormDraft Hook
 *
 * Automatically saves and restores form inputs and current step to/from sessionStorage.
 * When the page is reloaded, inputs and step progress are restored seamlessly
 * without requiring any manual clicking or banners.
 *
 * @param {Object} config
 * @param {string} config.storageKey - Unique sessionStorage key for this form type
 * @param {Object} config.formData - Current form state object
 * @param {Function} config.setFormData - Form state setter
 * @param {number} config.currentStep - Current active step number
 * @param {Function} config.setCurrentStep - Step state setter
 * @param {boolean} config.isSubmitted - True once the request ticket has been generated
 * @param {number} [config.debounceMs=400] - Debounce interval for writes
 */
export const useFormDraft = ({
  storageKey,
  formData,
  setFormData,
  currentStep,
  setCurrentStep,
  isSubmitted = false,
  debounceMs = 400,
}) => {
  const isHydratedRef = useRef(false);

  // 1. Automatic restore on initial mount
  useEffect(() => {
    if (!storageKey || isSubmitted || isHydratedRef.current) return;

    try {
      const savedRaw = sessionStorage.getItem(storageKey);
      if (savedRaw) {
        const parsed = JSON.parse(savedRaw);
        if (parsed && (parsed.formData || parsed.currentStep)) {
          if (hasMeaningfulData(parsed.formData, parsed.currentStep || 1)) {
            if (parsed.formData && setFormData) {
              setFormData((prev) => ({
                ...prev,
                ...parsed.formData,
              }));
            }
            if (parsed.currentStep && setCurrentStep) {
              setCurrentStep(parsed.currentStep);
            }
          }
        }
      }
    } catch (e) {
      console.warn(`Failed to auto-restore draft from sessionStorage (${storageKey}):`, e);
    } finally {
      isHydratedRef.current = true;
    }
  }, [storageKey, isSubmitted, setFormData, setCurrentStep]);

  // 2. Debounced background auto-save
  useEffect(() => {
    if (!storageKey || isSubmitted) return;

    // Do not save until initial hydration check has executed
    if (!isHydratedRef.current) return;

    // Only save if there is meaningful data to preserve
    if (!hasMeaningfulData(formData, currentStep)) return;

    const timer = setTimeout(() => {
      try {
        const payload = {
          formData,
          currentStep,
          updatedAt: Date.now(),
        };
        sessionStorage.setItem(storageKey, JSON.stringify(payload));
      } catch (e) {
        console.warn(`Failed to auto-save form draft (${storageKey}):`, e);
      }
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [formData, currentStep, storageKey, isSubmitted, debounceMs]);

  // 3. Purge storage if submitted
  useEffect(() => {
    if (isSubmitted && storageKey) {
      try {
        sessionStorage.removeItem(storageKey);
      } catch (e) {
        console.warn(`Failed to purge draft on submit (${storageKey}):`, e);
      }
    }
  }, [isSubmitted, storageKey]);

  // 4. Explicit Clear (used upon successful ticket generation or reset)
  const clearDraft = useCallback(() => {
    try {
      sessionStorage.removeItem(storageKey);
    } catch (e) {
      console.warn(`Failed to clear form draft (${storageKey}):`, e);
    }
  }, [storageKey]);

  return {
    clearDraft,
  };
};

export default useFormDraft;
