import React, { useEffect } from "react";

// This component comes from https://apps.humanatlas.io/us6
const FTUIllustration = ({ selectedIllustration, illustrations }) => {
  useEffect(() => {
    const ftu = document.getElementsByTagName("hra-medical-illustration")[0];
    ftu.addEventListener("cell-click", (event) => {
      if (!event.detail.representation_of){
        return
      }
      const id = event.detail.representation_of.split("/").pop()
      console.log(id)
    });
  }, []);
  return (
    <div className={"ftu-container"}>
      <hra-medical-illustration
        selected-illustration={selectedIllustration}
        illustrations={illustrations}
      ></hra-medical-illustration>
    </div>
  );
};

export default FTUIllustration;
