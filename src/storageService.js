import { storage } from "./firebaseConfig";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

export const subirArchivo = async (file, folder, projectId, reportDate) => {
  const fileName = `${projectId}_${reportDate}_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, "_")}`;
  const storageRef = ref(storage, `${folder}/${fileName}`);

  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
};
