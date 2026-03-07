const LineLoading = ({ isVisible = false }) => {
  if (!isVisible) return null;

  return (
    <>
      <div className="fixed top-0 left-0 right-1/2 h-[3px] z-[9999] overflow-hidden flex justify-end">
        <div className="bar-left h-full rounded-l-full bg-gradient-to-l from-yellow-200 via-yellow-400 to-yellow-600" />
      </div>

      <div className="fixed top-0 left-1/2 right-0 h-[3px] z-[9999] overflow-hidden">
        <div className="bar-right h-full rounded-r-full bg-gradient-to-r from-yellow-200 via-yellow-400 to-yellow-600" />
      </div>
    </>
  );
};

export default LineLoading;