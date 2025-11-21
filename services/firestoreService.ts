
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  orderBy, 
  onSnapshot,
  serverTimestamp,
  Timestamp,
  getDoc
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage, auth } from "../firebaseConfig";
import { Project, Message, ProjectStatus } from "../types";

const PROJECTS_COLLECTION = "projects";
const MESSAGES_COLLECTION = "messages";

export const createProject = async (project: Omit<Project, "id" | "updatedAt">) => {
  const docRef = await addDoc(collection(db, PROJECTS_COLLECTION), {
    ...project,
    updatedAt: serverTimestamp()
  });
  return docRef.id;
};

export const subscribeToProjects = (callback: (projects: Project[]) => void) => {
  const q = query(collection(db, PROJECTS_COLLECTION), orderBy("updatedAt", "desc"));
  return onSnapshot(q, (snapshot) => {
    const projects = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            ...data,
            updatedAt: (data.updatedAt as Timestamp)?.toMillis() || Date.now()
        };
    }) as Project[];
    callback(projects);
  });
};

export const updateProject = async (projectId: string, data: Partial<Project>) => {
  const docRef = doc(db, PROJECTS_COLLECTION, projectId);
  await updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp()
  });
};

export const deleteProject = async (projectId: string) => {
  await deleteDoc(doc(db, PROJECTS_COLLECTION, projectId));
};

export const duplicateProject = async (originalProject: Project, newName: string): Promise<string> => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id, updatedAt, ...rest } = originalProject;
    return await createProject({
        ...rest,
        name: newName,
        status: ProjectStatus.DRAFT,
    });
};

export const subscribeToMessages = (projectId: string, callback: (messages: Message[]) => void) => {
  const q = query(
    collection(db, PROJECTS_COLLECTION, projectId, MESSAGES_COLLECTION), 
    orderBy("timestamp", "asc")
  );
  return onSnapshot(q, (snapshot) => {
    const messages = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Message[];
    callback(messages);
  });
};

export const addMessage = async (projectId: string, message: Omit<Message, "id">) => {
  const docRef = await addDoc(collection(db, PROJECTS_COLLECTION, projectId, MESSAGES_COLLECTION), message);
  return docRef.id;
};

export const updateMessage = async (projectId: string, messageId: string, data: Partial<Message>) => {
    const docRef = doc(db, PROJECTS_COLLECTION, projectId, MESSAGES_COLLECTION, messageId);
    await updateDoc(docRef, data);
};

export const getProjectById = async (projectId: string): Promise<Project | null> => {
  const docRef = doc(db, PROJECTS_COLLECTION, projectId);
  const snapshot = await getDoc(docRef);
  if (snapshot.exists()) {
      const data = snapshot.data();
      return { 
          id: snapshot.id, 
          ...data, 
          updatedAt: (data.updatedAt as Timestamp)?.toMillis() || Date.now() 
      } as Project;
  }
  return null;
};

export const uploadFile = async (file: File, projectId: string): Promise<string> => {
  try {
    // Wait for Auth to be ready (max 3s)
    let attempts = 0;
    while (!auth.currentUser && attempts < 30) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
    
    if (!auth.currentUser) {
      console.error("No authenticated user for file upload");
      throw new Error("Authentication required for file upload");
    }
    
    console.log("Starting file upload:", file.name, "Size:", file.size);
    
    const timestamp = Date.now();
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const storagePath = `projects/${projectId}/uploads/${timestamp}_${sanitizedFileName}`;
    const storageRef = ref(storage, storagePath);
    
    const metadata = { 
      contentType: file.type,
      customMetadata: {
        originalName: file.name,
        uploadedAt: new Date().toISOString()
      }
    };
    
    console.log("Uploading to path:", storagePath);
    const uploadResult = await uploadBytes(storageRef, file, metadata);
    console.log("Upload successful, getting download URL...");
    
    const downloadURL = await getDownloadURL(uploadResult.ref);
    console.log("Download URL obtained:", downloadURL);
    
    return downloadURL;
  } catch (error) {
    console.error("File upload failed:", error);
    throw error;
  }
};
