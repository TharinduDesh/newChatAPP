// src/services/moderationService.js
import axios from "axios";
import { getCurrentAdmin } from "./authService";

const ADMIN_CONVO_URL = "http://localhost:5000/api/admin/conversations";
const ADMIN_MSG_URL = "http://localhost:5000/api/admin/messages";

const getAuthHeader = () => {
  const admin = getCurrentAdmin();
  return { Authorization: admin ? `Bearer ${admin.token}` : "" };
};

export const getAllConversations = async () => {
  const response = await axios.get(ADMIN_CONVO_URL, {
    headers: getAuthHeader(),
  });
  return response.data;
};

export const getConversationDetails = async (conversationId) => {
  const response = await axios.get(
    `${ADMIN_CONVO_URL}/${conversationId}/messages`,
    { headers: getAuthHeader() }
  );
  return response.data;
};

// Function for an admin to delete a message **
export const deleteMessageByAdmin = async (messageId) => {
  const response = await axios.delete(`${ADMIN_MSG_URL}/${messageId}`, {
    headers: getAuthHeader(),
  });
  return response.data;
};
