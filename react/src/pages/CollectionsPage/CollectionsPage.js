import BrowseBox from "../../components/BrowseBox/BrowseBox";
import { useContext } from "react";
import { GraphContext } from "../../components/Contexts/Contexts";

const CollectionsPage = () => {
  const graph = useContext(GraphContext);
  return <BrowseBox graph={graph} />;
};

export default CollectionsPage;
