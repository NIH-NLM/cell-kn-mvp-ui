import React, {useEffect, useRef, useState} from "react";
import InfoPopup from "../InfoPopup/InfoPopup";

// This component comes from https://apps.humanatlas.io/us6
const FTUIllustration = ({ selectedIllustration, illustrations }) => {
  const [popupData, setPopupData] = useState(null);
  const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 });
  const ftuRef = useRef();


  useEffect(() => {
    const ftu = document.getElementsByTagName("hra-medical-illustration")[0];
    if (!ftu) return;

    const handleCellClick = (event) => {
      if (!event.detail?.representation_of || !event.detail?.svg_id) {
        return;
      }

      // Get event data details
      const id = event.detail.representation_of.split("/").pop().replace("_", "/");
      const label = event.detail.label;
      setPopupData({ id, label });

      // Find web component rect
      const rect = ftuRef.current.getBoundingClientRect();
      setPopupPosition({ x: rect.left, y: rect.top });
    };

    // Add event listener
    ftu.addEventListener("cell-click", handleCellClick);

    // Cleanup
    return () => {
      ftu.removeEventListener("cell-click", handleCellClick);
    };
  }, []);

  const handleClosePopup = () => {
    setPopupData(null);
  };

  return (
    <div className={"ftu-container"}>
      <hra-medical-illustration
        selected-illustration={selectedIllustration}
        illustrations={illustrations}
        ref={ftuRef}
      ></hra-medical-illustration>

      <InfoPopup
        data={popupData}
        position={popupPosition}
        onClose={handleClosePopup}
      />
    </div>
  );
};

export default FTUIllustration;
