"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Card } from "~/components/ui/card";
import { X, UserPlus, Users, Check } from "lucide-react";
import { API_CONFIG } from "~/config/api";

interface WhitelistInfo {
  success: boolean;
  user_email: string;
  whitelisted_users: string[];  // Users this person has whitelisted
  whitelisted_by: string[];     // Users who have whitelisted this person
}

interface WhitelistResponse {
  success: boolean;
  message: string;
  requester_email: string;
  target_email: string;
}

export default function WhitelistManager() {
  const { data: session } = useSession();
  const [whitelistInfo, setWhitelistInfo] = useState<WhitelistInfo | null>(null);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  const userEmail = session?.user?.email;

  // Fetch whitelist information
  const fetchWhitelistInfo = useCallback(async () => {
    if (!userEmail) return;

    setIsLoading(true);
    try {
      const response = await API_CONFIG.database.whitelistGet();
      
      if (response.ok) {
        const data = await response.json() as WhitelistInfo;
        setWhitelistInfo(data);
      } else {
        console.error("Failed to fetch whitelist info:", response.status);
      }
    } catch (error) {
      console.error("Error fetching whitelist info:", error);
    } finally {
      setIsLoading(false);
    }
  }, [userEmail]);

  // Add user to whitelist
  const addUserToWhitelist = useCallback(async () => {
    if (!userEmail || !newUserEmail.trim()) return;

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newUserEmail.trim())) {
      setFeedbackMessage({ type: 'error', message: 'Please enter a valid email address' });
      return;
    }

    if (newUserEmail.trim() === userEmail) {
      setFeedbackMessage({ type: 'error', message: 'You cannot whitelist yourself' });
      return;
    }

    setIsAddingUser(true);
    try {
      const response = await API_CONFIG.database.whitelistAdd({
        requester_email: userEmail,
        target_email: newUserEmail.trim(),
      });

      if (response.ok) {
        const data = await response.json() as WhitelistResponse;
        setFeedbackMessage({ type: 'success', message: data.message });
        setNewUserEmail("");
        await fetchWhitelistInfo(); // Refresh the list
      } else {
        const errorData = await response.json() as { detail?: string };
        setFeedbackMessage({ type: 'error', message: errorData.detail ?? 'Failed to add user to whitelist' });
      }
    } catch (error) {
      console.error("Error adding user to whitelist:", error);
      setFeedbackMessage({ type: 'error', message: 'Network error occurred' });
    } finally {
      setIsAddingUser(false);
    }
  }, [userEmail, newUserEmail, fetchWhitelistInfo]);

  // Remove user from whitelist
  const removeUserFromWhitelist = useCallback(async (targetEmail: string) => {
    if (!userEmail) return;

    try {
      const response = await API_CONFIG.database.whitelistRemove({
        requester_email: userEmail,
        target_email: targetEmail,
      });

      if (response.ok) {
        const data = await response.json() as WhitelistResponse;
        setFeedbackMessage({ type: 'success', message: data.message });
        await fetchWhitelistInfo(); // Refresh the list
      } else {
        const errorData = await response.json() as { detail?: string };
        setFeedbackMessage({ type: 'error', message: errorData.detail ?? 'Failed to remove user from whitelist' });
      }
    } catch (error) {
      console.error("Error removing user from whitelist:", error);
      setFeedbackMessage({ type: 'error', message: 'Network error occurred' });
    }
  }, [userEmail, fetchWhitelistInfo]);

  // Clear feedback message after a delay
  useEffect(() => {
    if (feedbackMessage) {
      const timer = setTimeout(() => {
        setFeedbackMessage(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [feedbackMessage]);

  // Load whitelist info on component mount
  useEffect(() => {
    void fetchWhitelistInfo();
  }, [fetchWhitelistInfo]);

  // Handle Enter key press in input
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      void addUserToWhitelist();
    }
  };

  if (!session) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-2">
        <Users className="h-5 w-5 text-zinc-400" />
        <h2 className="text-lg font-semibold text-white">Database Access Management</h2>
      </div>

      {/* Feedback Message */}
      {feedbackMessage && (
        <div className={`p-3 rounded-lg text-sm ${
          feedbackMessage.type === 'success' 
            ? 'bg-green-900/20 text-green-400 border border-green-800/30' 
            : 'bg-red-900/20 text-red-400 border border-red-800/30'
        }`}>
          <div className="flex items-center space-x-2">
            {feedbackMessage.type === 'success' && <Check className="h-4 w-4" />}
            <span>{feedbackMessage.message}</span>
          </div>
        </div>
      )}

      {/* Add User Section */}
      <Card className="p-4 bg-[#1a1a1a] border-zinc-800">
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-zinc-300 flex items-center space-x-2">
            <UserPlus className="h-4 w-4" />
            <span>Grant Database Access</span>
          </h3>
          <div className="flex space-x-2">
            <Input
              type="email"
              placeholder="Enter email address to whitelist"
              value={newUserEmail}
              onChange={(e) => setNewUserEmail(e.target.value)}
              onKeyPress={handleKeyPress}
              className="flex-1 bg-[#2a2a2a] border-zinc-700 text-white placeholder-zinc-500"
              disabled={isAddingUser}
            />
            <Button
              onClick={() => void addUserToWhitelist()}
              disabled={isAddingUser || !newUserEmail.trim()}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4"
            >
              {isAddingUser ? "Adding..." : "Add"}
            </Button>
          </div>
          <p className="text-xs text-zinc-500">
            Users you whitelist will be able to query your database and you&apos;ll be able to query theirs.
          </p>
        </div>
      </Card>

      {/* Whitelist Information */}
      {isLoading ? (
        <Card className="p-6 bg-[#1a1a1a] border-zinc-800">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-zinc-600 border-t-blue-500"></div>
            <span className="ml-2 text-zinc-400">Loading whitelist information...</span>
          </div>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {/* Users I've Whitelisted */}
          <Card className="p-4 bg-[#1a1a1a] border-zinc-800">
            <h3 className="text-sm font-medium text-zinc-300 mb-3">
              Users I&apos;ve Granted Access ({whitelistInfo?.whitelisted_users.length ?? 0})
            </h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {whitelistInfo?.whitelisted_users.length === 0 ? (
                <p className="text-xs text-zinc-500 italic">No users whitelisted yet</p>
              ) : (
                whitelistInfo?.whitelisted_users.map((email) => (
                  <div
                    key={email}
                    className="flex items-center justify-between p-2 bg-[#2a2a2a] rounded-lg"
                  >
                    <span className="text-sm text-zinc-300 truncate flex-1">{email}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => void removeUserFromWhitelist(email)}
                      className="ml-2 h-6 w-6 p-0 text-zinc-500 hover:text-red-400 hover:bg-red-900/20"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </Card>

          {/* Users Who've Whitelisted Me */}
          <Card className="p-4 bg-[#1a1a1a] border-zinc-800">
            <h3 className="text-sm font-medium text-zinc-300 mb-3">
              Users Who&apos;ve Granted Me Access ({whitelistInfo?.whitelisted_by.length ?? 0})
            </h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {whitelistInfo?.whitelisted_by.length === 0 ? (
                <p className="text-xs text-zinc-500 italic">No one has whitelisted you yet</p>
              ) : (
                whitelistInfo?.whitelisted_by.map((email) => (
                  <div
                    key={email}
                    className="flex items-center p-2 bg-[#2a2a2a] rounded-lg"
                  >
                    <span className="text-sm text-zinc-300 truncate">{email}</span>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
} 