"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { signOut, useSession } from "next-auth/react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { cn } from "~/lib/utils";
import {
  Send,
  Menu,
  Plus,
  LogOut,
  Trash2,
  User,
  Check,
  ChevronUp,
  ChevronDown,
  Trophy,
  Upload,
  X,
} from "lucide-react";
import { useChat } from "~/hooks/use-chat";
import { formatDistanceToNow } from "date-fns";
import { Avatar, AvatarImage, AvatarFallback } from "~/components/ui/avatar";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useRouter } from "next/navigation";
import { API_CONFIG } from "~/config/api";

export default function ChatInterface() {
  const {
    chats,
    activeChat,
    isLoading,
    inputValue,
    setInputValue,
    sendMessage,
    startNewChat,
    removeChat,
    responseOptions,
    showResponseOptions,
    selectResponseOption,
    responseMode,
    setResponseMode,
    scoreResponseOption,
    scoredOptions,
    rankedOptions,
    moveResponseUp,
    moveResponseDown,
    confirmRanking,
    // Pull in the new dropdown state and setter:
    openRouterModel,
    setOpenRouterModel,
    // Pull in upload status:
    uploadStatus,
    setUploadStatus,
    clearUploadStatus,
  } = useChat();

  const { data: session } = useSession();
  const [showSidebar, setShowSidebar] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [googleDriveLink, setGoogleDriveLink] = useState("");
  const [isSubmittingUpload, setIsSubmittingUpload] = useState(false);
  const [showSuccessNotification, setShowSuccessNotification] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Upload status tracking - now managed by useChat hook
  const [isRefreshingStatus, setIsRefreshingStatus] = useState(false);

  // Processing options state
  const [selectedConverters, setSelectedConverters] = useState<string[]>(["markitdown"]);
  const [selectedChunkers, setSelectedChunkers] = useState<string[]>(["recursive"]);
  const [selectedEmbedders, setSelectedEmbedders] = useState<string[]>(["bge"]);

  // Upload modal step management
  const [uploadStep, setUploadStep] = useState<1 | 2>(1);
  const [researchArea, setResearchArea] = useState("");
  const [isScrapingResearch, setIsScrapingResearch] = useState(false);
  const [scrapedDriveLink, setScrapedDriveLink] = useState("");
  const [scrapingError, setScrapingError] = useState("");

  // Available options
  const availableConverters = ["marker", "openai", "markitdown"];
  const availableChunkers = ["fixed_length", "recursive", "markdown_aware", "semantic_split"];
  const availableEmbedders = ["openai", "bge"];

  // Check upload status function
  const checkUploadStatus = useCallback(async () => {
    if (!session?.user?.email) return;

    setIsRefreshingStatus(true);
    
    try {
      const statusUrl = `${API_CONFIG.light.url}/api/status?user_email=${encodeURIComponent(session.user.email)}`;
      const response = await fetch(statusUrl, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "true",  // Skip ngrok browser warning for free tunnels
        },
        mode: "cors",
      });

      if (response.ok) {
        const statusData = await response.json() as {
          total_jobs: number;
          completed_jobs: number;
          completion_percentage: number;
        };
        
        const newStatus = {
          isTracking: true,
          totalJobs: statusData.total_jobs,
          completedJobs: statusData.completed_jobs,
          percentage: statusData.completion_percentage,
        };
        
        setUploadStatus(newStatus);
        
        // Switch back to upload mode if >90% complete
        if (statusData.completion_percentage > 90) {
          setTimeout(() => {
            clearUploadStatus();
          }, 2000); // Give user time to see completion
        }
      } else {
        console.error("Failed to fetch upload status");
      }
    } catch (error) {
      console.error("Error checking upload status:", error);
    } finally {
      setIsRefreshingStatus(false);
    }
  }, [session?.user?.email, setUploadStatus, clearUploadStatus]);

  // Auto-scroll logic
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [activeChat?.messages, responseOptions, isLoading]);

  // Auto-check upload status on component load if tracking is in progress
  useEffect(() => {
    if (uploadStatus.isTracking && session?.user?.email) {
      // Check status immediately if we have a tracking session
      void checkUploadStatus();
      
      // Set up interval to check status every 10 seconds
      const interval = setInterval(() => {
        void checkUploadStatus();
      }, 10000);
      
      return () => clearInterval(interval);
    }
  }, [uploadStatus.isTracking, session?.user?.email, checkUploadStatus]);

  // Research scraping function
  const handleResearchScrape = async () => {
    if (!researchArea.trim()) return;
    
    // Check if user is logged in
    if (!session?.user?.email) {
      setScrapingError("Please log in to scrape research papers");
      return;
    }

    setIsScrapingResearch(true);
    setScrapingError("");
    
    try {
      const scrapeUrl = `${API_CONFIG.light.url}${API_CONFIG.light.endpoints.researchScrape}`;
      const response = await fetch(scrapeUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "true",  // Skip ngrok browser warning for free tunnels
        },
        mode: "cors",
        body: JSON.stringify({
          research_area: researchArea.trim(),
          user_email: session.user.email,
        }),
      });

      if (response.ok) {
        // Check if the response is a file (zip)
        const contentType = response.headers.get("content-type");
        if (contentType?.includes("application/zip")) {
          // Handle file download
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          
          // Get filename from Content-Disposition header or create a default one
          const contentDisposition = response.headers.get("content-disposition");
          let filename = "research_papers.zip";
          if (contentDisposition) {
            const filenameRegex = /filename="?([^"]+)"?/;
            const filenameMatch = filenameRegex.exec(contentDisposition);
            if (filenameMatch?.[1]) {
              filename = filenameMatch[1];
            }
          }
          
          link.download = filename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
          
          // Get paper count from headers if available
          const paperCount = response.headers.get("X-Papers-Count");
          const paperCountText = paperCount ? ` (${paperCount} papers)` : "";
          
          // Show success message
          setScrapedDriveLink(`Downloaded: ${filename}${paperCountText ?? ""}`);
        } else {
          // Handle JSON error response
          const responseData = await response.json() as {
            success: boolean;
            message?: string;
            error?: string;
          };
          setScrapingError(responseData.error ?? responseData.message ?? "Failed to scrape research papers");
        }
      } else {
        const errorText = await response.text();
        setScrapingError(`API Error (${response.status}): ${errorText}`);
      }
    } catch (error) {
      console.error("Error scraping research:", error);
      setScrapingError(`Network error: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsScrapingResearch(false);
    }
  };
  
  // Reset upload modal state
  const resetUploadModal = () => {
    setUploadStep(1);
    setResearchArea("");
    setScrapedDriveLink("");
    setScrapingError("");
    setGoogleDriveLink("");
    setSelectedConverters(["markitdown"]);
    setSelectedChunkers(["recursive"]);
    setSelectedEmbedders(["bge"]);
  };

  const handleUploadSubmit = async () => {
    if (!googleDriveLink.trim()) return;
    
    // Check if user is logged in
    if (!session?.user?.email) {
      console.error("User not logged in");
      return;
    }

    console.log("Starting upload submission...");
    setIsSubmittingUpload(true);
    
    try {
      // Use heavy server for upload/ingest operations
      const uploadUrl = `${API_CONFIG.heavy.url}${API_CONFIG.heavy.endpoints.ingest}`;
      console.log("Sending request to:", uploadUrl);
      const response = await fetch(uploadUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "ngrok-skip-browser-warning": "true",  // Skip ngrok browser warning for free tunnels
        },
        mode: "cors",
        body: JSON.stringify({
          drive_url: googleDriveLink.trim(),
          converters: selectedConverters,
          chunkers: selectedChunkers,
          embedders: selectedEmbedders,
          user_email: session.user.email,
        }),
      });

      console.log("Response status:", response.status);
      console.log("Response ok:", response.ok);

      if (response.ok) {
        console.log("Upload response successful, parsing JSON...");
        const responseData = await response.json() as {
          success: boolean;
          message: string;
          downloaded_files: string[];
          total_files: number;
          processing_combinations: string[];
          processing_started: boolean;
        };
        
        console.log("Upload response:", responseData);
        console.log("Processing combinations:", responseData.processing_combinations);
        console.log("Total files:", responseData.total_files);
        
        // Calculate total jobs
        const totalJobs = (responseData.processing_combinations.length * responseData.total_files) * 2;
        console.log("Calculated total jobs:", totalJobs);
        
        // Show success notification
        setShowSuccessNotification(true);
        setShowUploadModal(false);
        resetUploadModal();
        
        // Start status tracking
        const newStatus = {
          isTracking: true,
          totalJobs: totalJobs,
          completedJobs: 0,
          percentage: 0,
        };
        console.log("About to call setUploadStatus with:", newStatus);
        setUploadStatus(newStatus);
        console.log("setUploadStatus called, current uploadStatus:", uploadStatus);
        
        // Check status immediately
        setTimeout(() => {
          console.log("Calling checkUploadStatus after 1 second");
          void checkUploadStatus();
        }, 1000);
        
        // Hide success notification after 3 seconds
        setTimeout(() => {
          setShowSuccessNotification(false);
        }, 3000);
      } else {
        console.error("Upload failed with status:", response.status);
        const errorText = await response.text();
        console.error("Error response:", errorText);
        throw new Error("Upload failed");
      }
    } catch (error) {
      console.error("Error submitting upload:", error);
      // Handle error - could show a toast or error state
    } finally {
      setIsSubmittingUpload(false);
      console.log("Upload submission completed");
    }
  };

  const toggleSidebar = () => {
    setShowSidebar((prev) => !prev);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void sendMessage(inputValue);
  };

  const handleSignOut = async () => {
    await signOut({ callbackUrl: "/auth/signin" });
  };

  const navigateToChat = (chatId: string) => {
    router.push(`/chat/${chatId}`);
  };

  const getOrdinalSuffix = (num: number): string => {
    if (num === 1) return "st";
    if (num === 2) return "nd";
    if (num === 3) return "rd";
    return "th";
  };

  const allOptionsScored =
    responseOptions.length > 0 &&
    responseOptions.every((option) => scoredOptions.has(option.id));

  const toggleSelection = (
    item: string, 
    selectedItems: string[], 
    setSelectedItems: (items: string[]) => void
  ) => {
    if (selectedItems.includes(item)) {
      // Remove if already selected (but keep at least one)
      if (selectedItems.length > 1) {
        setSelectedItems(selectedItems.filter(i => i !== item));
      }
    } else {
      // Add if not selected
      setSelectedItems([...selectedItems, item]);
    }
  };

  // Debug: Log upload status on every render
  console.log("Render: uploadStatus =", uploadStatus);

  return (
    <div className="flex h-screen bg-[#0f0f0f]">
      {/* Success Notification */}
      {showSuccessNotification && (
        <div className="fixed top-4 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-in slide-in-from-top-2 duration-500">
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4" />
            <span className="text-sm font-medium">Processing started successfully!</span>
          </div>
          <div className="text-xs mt-1 opacity-90">
            Papers are being processed in the background
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6 w-full max-w-3xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <h3 className="text-lg font-medium text-white">
                  {uploadStep === 1 ? "Find Research Papers" : "Upload Papers from Google Drive"}
                </h3>
                {/* Step indicators */}
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium",
                    uploadStep === 1 ? "bg-[#1a7f64] text-white" : "bg-[#2a2a2a] text-zinc-400"
                  )}>
                    1
                  </div>
                  <div className="w-8 h-px bg-[#2a2a2a]"></div>
                  <div className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium",
                    uploadStep === 2 ? "bg-[#1a7f64] text-white" : "bg-[#2a2a2a] text-zinc-400"
                  )}>
                    2
                  </div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setShowUploadModal(false);
                  resetUploadModal();
                }}
                className="h-8 w-8 text-zinc-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            {uploadStep === 1 ? (
              /* Step 1: Research Area Input */
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <h4 className="text-sm font-medium text-zinc-300 mb-2">Optional: Let us find research papers for you</h4>
                  <p className="text-xs text-zinc-500">
                    Enter an area of research and we&apos;ll find and download relevant papers for you to upload to Google Drive, or skip to use your own link
                  </p>
                </div>

                <div>
                  <label className="text-sm text-zinc-300 mb-2 block">
                    Research Area or Topic
                  </label>
                  <textarea
                    value={researchArea}
                    onChange={(e) => setResearchArea(e.target.value)}
                    placeholder="e.g., quantum computing algorithms, machine learning in healthcare, sustainable energy solutions..."
                    className="w-full bg-[#2a2a2a] border-[#3a3a3a] text-white focus:border-[#1a7f64] rounded-md p-3 min-h-[100px] resize-none"
                    disabled={isScrapingResearch}
                  />
                  <p className="text-xs text-zinc-500 mt-1">
                    Be specific about your research interests for better results
                  </p>
                </div>

                {/* Scraping Error */}
                {scrapingError && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                    <p className="text-red-400 text-sm">{scrapingError}</p>
                  </div>
                )}

                {/* Research Papers Downloaded */}
                {scrapedDriveLink && (
                  <div className="bg-[#2a2a2a] border border-[#3a3a3a] rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Check className="h-4 w-4 text-green-400" />
                      <span className="text-sm font-medium text-green-400">Research Papers Downloaded!</span>
                    </div>
                    <div className="text-xs text-zinc-400 mb-3">
                      {scrapedDriveLink}
                    </div>
                    
                    <div className="bg-[#1a1a1a] border border-[#3a3a3a] rounded-lg p-3">
                      <p className="text-sm font-medium text-zinc-300 mb-2">📝 Next Steps:</p>
                      <ol className="text-xs text-zinc-400 space-y-1 list-decimal list-inside">
                        <li>Extract the downloaded zip file to access your research papers</li>
                        <li>Upload the PDF files to a Google Drive folder</li>
                        <li>Make the Google Drive folder <strong className="text-zinc-300">public</strong> (share settings → &ldquo;Anyone with the link&rdquo;)</li>
                        <li>Copy the public folder link and paste it below</li>
                      </ol>
                    </div>
                    
                    <div className="mt-3 text-xs text-zinc-500">
                      💡 <strong>Tip:</strong> Making the folder public allows the system to access and process your papers automatically.
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3 justify-between pt-4 border-t border-[#3a3a3a]">
                  <Button
                    variant="ghost"
                    onClick={() => setUploadStep(2)}
                    className="text-zinc-400 hover:text-white"
                  >
                    Skip - Use My Own Link
                  </Button>
                  <div className="flex gap-3">
                    {scrapedDriveLink && (
                      <Button
                        onClick={() => setUploadStep(2)}
                        className="bg-[#1a7f64] hover:bg-[#18735a]"
                      >
                        Next - Upload to Drive
                      </Button>
                    )}
                    <Button
                      onClick={handleResearchScrape}
                      disabled={!researchArea.trim() || isScrapingResearch}
                      className="bg-[#1a7f64] hover:bg-[#18735a]"
                    >
                      {isScrapingResearch ? "Finding Papers..." : "Find Papers"}
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              /* Step 2: Google Drive Upload Form */
              <div className="space-y-6">
                <div className="flex items-center justify-between mb-4">
                  <Button
                    variant="ghost"
                    onClick={() => setUploadStep(1)}
                    className="text-zinc-400 hover:text-white text-sm"
                  >
                    ← Back to Research Search
                  </Button>
                </div>

                {/* Google Drive Link */}
                <div>
                  <label className="text-sm text-zinc-300 mb-2 block">
                    Google Drive Folder Link
                  </label>
                  <Input
                    type="url"
                    value={googleDriveLink}
                    onChange={(e) => setGoogleDriveLink(e.target.value)}
                    placeholder="https://drive.google.com/drive/folders/..."
                    className="bg-[#2a2a2a] border-[#3a3a3a] text-white focus:border-[#1a7f64]"
                  />
                  <p className="text-xs text-zinc-500 mt-1">
                    Provide a public Google Drive folder link containing PDF files
                  </p>
                </div>

                {/* Processing Options */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Converters */}
                  <div>
                    <label className="text-sm text-zinc-300 mb-3 block font-medium">
                      Converters
                    </label>
                    <div className="space-y-2">
                      {availableConverters.map((converter) => (
                        <label
                          key={converter}
                          className="flex items-center space-x-2 cursor-pointer hover:bg-[#2a2a2a] p-2 rounded transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={selectedConverters.includes(converter)}
                            onChange={() => toggleSelection(converter, selectedConverters, setSelectedConverters)}
                            className="w-4 h-4 text-[#1a7f64] bg-[#2a2a2a] border-[#3a3a3a] rounded focus:ring-[#1a7f64] focus:ring-2"
                          />
                          <span className="text-sm text-zinc-300 capitalize">{converter}</span>
                        </label>
                      ))}
                    </div>
                    <p className="text-xs text-zinc-500 mt-2">
                      At least one converter must be selected
                    </p>
                  </div>

                  {/* Chunkers */}
                  <div>
                    <label className="text-sm text-zinc-300 mb-3 block font-medium">
                      Chunkers
                    </label>
                    <div className="space-y-2">
                      {availableChunkers.map((chunker) => (
                        <label
                          key={chunker}
                          className="flex items-center space-x-2 cursor-pointer hover:bg-[#2a2a2a] p-2 rounded transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={selectedChunkers.includes(chunker)}
                            onChange={() => toggleSelection(chunker, selectedChunkers, setSelectedChunkers)}
                            className="w-4 h-4 text-[#1a7f64] bg-[#2a2a2a] border-[#3a3a3a] rounded focus:ring-[#1a7f64] focus:ring-2"
                          />
                          <span className="text-sm text-zinc-300 capitalize">{chunker.replace('_', ' ')}</span>
                        </label>
                      ))}
                    </div>
                    <p className="text-xs text-zinc-500 mt-2">
                      At least one chunker must be selected
                    </p>
                  </div>

                  {/* Embedders */}
                  <div>
                    <label className="text-sm text-zinc-300 mb-3 block font-medium">
                      Embedders
                    </label>
                    <div className="space-y-2">
                      {availableEmbedders.map((embedder) => (
                        <label
                          key={embedder}
                          className="flex items-center space-x-2 cursor-pointer hover:bg-[#2a2a2a] p-2 rounded transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={selectedEmbedders.includes(embedder)}
                            onChange={() => toggleSelection(embedder, selectedEmbedders, setSelectedEmbedders)}
                            className="w-4 h-4 text-[#1a7f64] bg-[#2a2a2a] border-[#3a3a3a] rounded focus:ring-[#1a7f64] focus:ring-2"
                          />
                          <span className="text-sm text-zinc-300 capitalize">{embedder}</span>
                        </label>
                      ))}
                    </div>
                    <p className="text-xs text-zinc-500 mt-2">
                      At least one embedder must be selected
                    </p>
                  </div>
                </div>

                {/* Processing Combinations Info */}
                <div className="bg-[#2a2a2a] border border-[#3a3a3a] rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 bg-[#1a7f64] rounded-full"></div>
                    <span className="text-sm font-medium text-zinc-300">Processing Combinations</span>
                  </div>
                  <p className="text-xs text-zinc-400 mb-2">
                    {selectedConverters.length} × {selectedChunkers.length} × {selectedEmbedders.length} = {selectedConverters.length * selectedChunkers.length * selectedEmbedders.length} combinations will be processed
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {(() => {
                      const allCombinations: string[] = [];
                      selectedConverters.forEach(conv => {
                        selectedChunkers.forEach(chunk => {
                          selectedEmbedders.forEach(emb => {
                            allCombinations.push(`${conv}_${chunk}_${emb}`);
                          });
                        });
                      });
                      
                      const maxDisplay = 12;
                      const toShow = allCombinations.slice(0, maxDisplay);
                      
                      return (
                        <>
                          {toShow.map((combination, index) => (
                            <span key={`${combination}-${index}`} className="text-xs bg-[#3a3a3a] px-2 py-1 rounded">
                              {combination}
                            </span>
                          ))}
                          {allCombinations.length > maxDisplay && (
                            <span className="text-xs text-zinc-500 px-2 py-1">
                              +{allCombinations.length - maxDisplay} more...
                            </span>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </div>
                
                {/* Action Buttons */}
                <div className="flex gap-3 justify-end pt-4 border-t border-[#3a3a3a]">
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setShowUploadModal(false);
                      resetUploadModal();
                    }}
                    className="text-zinc-400 hover:text-white"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleUploadSubmit}
                    disabled={
                      !googleDriveLink.trim() || 
                      isSubmittingUpload ||
                      selectedConverters.length === 0 ||
                      selectedChunkers.length === 0 ||
                      selectedEmbedders.length === 0
                    }
                    className="bg-[#1a7f64] hover:bg-[#18735a]"
                  >
                    {isSubmittingUpload ? "Processing..." : "Start Processing"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sidebar */}
      {showSidebar && (
        <div className="w-[260px] border-r border-[#2a2a2a] bg-black flex-shrink-0">
          <div className="h-full flex flex-col">
            <div className="p-4">
              <Button
                variant="outline"
                className="w-full justify-start gap-2 bg-[#2a2a2a] border-none hover:bg-[#343541] text-zinc-300 transition-all duration-200 hover:scale-[1.02] hover:shadow-lg active:scale-[0.98] transform"
                onClick={startNewChat}
              >
                <Plus className="h-4 w-4 transition-transform duration-200 group-hover:rotate-90" />
                New Chat
              </Button>
            </div>

            <div className="flex-1 overflow-auto py-2 px-2">
              <div className="space-y-1">
                {chats.map((chat) => (
                  <div
                    key={chat.id}
                    className={cn(
                      "flex items-center group rounded-md hover:bg-[#2a2a2a] transition-all duration-200 hover:scale-[1.01] transform",
                      activeChat?.id === chat.id && "bg-[#2a2a2a] shadow-sm"
                    )}
                  >
                    <div
                      className="flex-1 py-2 px-3 cursor-pointer transition-all duration-150 hover:translate-x-1"
                      onClick={() => navigateToChat(chat.id)}
                    >
                      <div className="truncate">
                        <div className="text-sm">{chat.title}</div>
                        <div className="text-xs text-zinc-400">
                          {formatDistanceToNow(new Date(chat.updatedAt), {
                            addSuffix: true,
                          })}
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="opacity-0 group-hover:opacity-100 h-8 w-8 ml-1 mr-1 transition-all duration-200 hover:bg-red-500/20 hover:text-red-400 hover:scale-110 active:scale-95"
                      onClick={() => removeChat(chat.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5 transition-transform duration-200 hover:rotate-12" />
                      <span className="sr-only">Delete</span>
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 border-t border-[#2a2a2a]">
              <Button
                variant="ghost"
                className="w-full justify-start text-sm gap-2 transition-all duration-200 hover:bg-red-500/10 hover:text-red-400 hover:scale-[1.02] active:scale-[0.98]"
                onClick={handleSignOut}
              >
                <LogOut className="h-4 w-4 transition-transform duration-200 hover:-translate-x-1" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex flex-col flex-1 h-full bg-[#0a0a0a]">
        {/* Header */}
        <header className="flex items-center h-12 px-4 border-b border-[#2a2a2a] bg-[#0a0a0a]">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="mr-2 transition-all duration-200 hover:bg-[#2a2a2a] hover:scale-110 active:scale-95"
          >
            <Menu className="h-5 w-5 transition-transform duration-200 hover:rotate-180" />
            <span className="sr-only">Toggle Sidebar</span>
          </Button>

          <h1 className="font-medium text-sm">
            {activeChat?.title ?? "New Chat"}
          </h1>

          <div className="ml-4">
            {/* Dropdown for selecting OpenRouter model */}
            <select
              value={openRouterModel}
              onChange={(e) => setOpenRouterModel(e.target.value)}
              className="bg-[#2a2a2a] text-zinc-300 border-none rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[#1a7f64] focus:border-[#1a7f64]"
            >
              <option value="openai/gpt-4o-mini">gpt-4o-mini</option>
              <option value="openai/gpt-4o">gpt-4o</option>
              <option value="anthropic/claude-3.5-sonnet">claude-3.5-sonnet</option>
              <option value="google/gemini-pro-1.5">gemini-pro-1.5</option>
              <option value="meta-llama/llama-3.1-70b-instruct">llama-3.1-70b</option>
              <option value="mistralai/mistral-7b-instruct">mistral-7b</option>
            </select>
          </div>

          <div className="ml-auto flex items-center space-x-2">
            {/* Upload Papers Button or Status Bar */}
            {uploadStatus.isTracking ? (
              /* Status Bar */
              <div className="flex items-center gap-2 bg-[#2a2a2a] border border-[#3a3a3a] rounded-lg px-3 py-2 min-w-[200px]">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-zinc-300 font-medium">Processing Papers</span>
                    <span className="text-xs text-zinc-400">
                      {uploadStatus.completedJobs}/{uploadStatus.totalJobs}
                    </span>
                  </div>
                  <div className="w-full bg-[#1a1a1a] rounded-full h-2">
                    <div 
                      className="bg-[#1a7f64] h-2 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(uploadStatus.percentage, 100)}%` }}
                    ></div>
                  </div>
                  <div className="text-xs text-zinc-500 mt-1">
                    {uploadStatus.percentage.toFixed(1)}% complete
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => void checkUploadStatus()}
                  disabled={isRefreshingStatus}
                  className="h-8 w-8 text-zinc-400 hover:text-white flex-shrink-0"
                  title="Refresh status"
                >
                  <div className={cn("h-4 w-4", isRefreshingStatus && "animate-spin")}>
                    🔄
                  </div>
                </Button>
              </div>
            ) : (
              /* Upload Papers Button */
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  resetUploadModal();
                  setShowUploadModal(true);
                }}
                className="text-xs bg-[#2a2a2a] border-none hover:bg-[#343541] text-zinc-300 transition-all duration-200 hover:scale-105 hover:shadow-lg active:scale-95 group mr-2"
              >
                <Upload className="h-3 w-3 mr-1 transition-transform duration-200 group-hover:-translate-y-0.5" />
                Upload Papers
              </Button>
            )}

            {/* Response Mode Toggle */}
            <div className="flex items-center gap-2 mr-4">
              <span
                className={cn(
                  "text-xs transition-colors cursor-pointer hover:opacity-80",
                  responseMode === "manual"
                    ? "text-[#1a7f64]"
                    : "text-zinc-400"
                )}
                onClick={() => setResponseMode("manual")}
              >
                Manual
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() =>
                  setResponseMode((prev) =>
                    prev === "manual"
                      ? "scoring"
                      : prev === "scoring"
                      ? "ranking"
                      : "manual"
                  )
                }
                className="h-8 w-8 transition-all duration-200 hover:scale-110"
              >
                {responseMode === "manual" ? (
                  <div className="w-2 h-2 rounded-full bg-[#1a7f64]" />
                ) : responseMode === "scoring" ? (
                  <div className="w-2 h-2 rounded-full bg-orange-500" />
                ) : (
                  <div className="w-2 h-2 rounded-full bg-purple-500" />
                )}
              </Button>
              <span
                className={cn(
                  "text-xs transition-colors cursor-pointer hover:opacity-80",
                  responseMode === "scoring"
                    ? "text-orange-500"
                    : "text-zinc-400"
                )}
                onClick={() => setResponseMode("scoring")}
              >
                Scoring
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() =>
                  setResponseMode((prev) =>
                    prev === "ranking"
                      ? "manual"
                      : prev === "manual"
                      ? "scoring"
                      : "ranking"
                  )
                }
                className="h-8 w-8 transition-all duration-200 hover:scale-110"
              >
                {responseMode === "ranking" ? (
                  <div className="w-2 h-2 rounded-full bg-purple-500" />
                ) : (
                  <div className="w-2 h-2 rounded-full bg-zinc-600" />
                )}
              </Button>
              <span
                className={cn(
                  "text-xs transition-colors cursor-pointer hover:opacity-80",
                  responseMode === "ranking"
                    ? "text-purple-500"
                    : "text-zinc-400"
                )}
                onClick={() => setResponseMode("ranking")}
              >
                Ranking
              </span>
            </div>

            {session?.user && (
              <div className="flex items-center mr-4 transition-all duration-200 hover:scale-105">
                <Avatar className="h-7 w-7 mr-2 transition-all duration-200 hover:scale-110">
                  {session.user.image ? (
                    <AvatarImage
                      src={session.user.image}
                      alt={session.user.name ?? "User"}
                    />
                  ) : (
                    <AvatarFallback className="bg-[#1a7f64]">
                      <User className="h-3.5 w-3.5" />
                    </AvatarFallback>
                  )}
                </Avatar>
                <span className="text-xs text-zinc-300">
                  {session.user.name ?? session.user.email}
                </span>
              </div>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={startNewChat}
              className="text-xs bg-[#2a2a2a] border-none hover:bg-[#343541] text-zinc-300 transition-all duration-200 hover:scale-105 hover:shadow-lg active:scale-95 group"
            >
              <Plus className="h-3 w-3 mr-1 transition-transform duration-200 group-hover:rotate-90" />
              New Chat
            </Button>
          </div>
        </header>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col bg-[#0a0a0a] overflow-hidden">
          {/* Messages */}
          <div ref={chatContainerRef} className="flex-1 overflow-y-auto py-6 px-4 lg:px-16">
            <div className="max-w-3xl mx-auto space-y-8">
              {activeChat?.messages?.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "group animate-in slide-in-from-bottom-2 duration-500",
                    message.role === "user" ? "text-right" : ""
                  )}
                >
                  {message.role === "assistant" ? (
                    <div className="flex items-start">
                      <div className="shrink-0 w-9 h-9 bg-[#1a7f64] rounded-full flex items-center justify-center mr-4 text-sm font-medium transition-all duration-300 hover:scale-110 hover:shadow-lg hover:shadow-[#1a7f64]/30">
                        AI
                      </div>
                      <div className="prose prose-invert max-w-none">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            strong: ({ node: _node, ...props }) => (
                              <span className="font-bold text-[#4fd1c5]" {...props} />
                            ),
                            h1: ({ node: _node, ...props }) => (
                              <h1 className="text-xl font-bold mt-4 mb-2" {...props} />
                            ),
                            h2: ({ node: _node, ...props }) => (
                              <h2 className="text-lg font-bold mt-3 mb-2" {...props} />
                            ),
                            h3: ({ node: _node, ...props }) => (
                              <h3 className="text-md font-bold mt-3 mb-1" {...props} />
                            ),
                            ul: ({ node: _node, ...props }) => (
                              <ul className="list-disc pl-5 my-2 space-y-1" {...props} />
                            ),
                            ol: ({ node: _node, ...props }) => (
                              <ol className="list-decimal pl-5 my-2 space-y-1" {...props} />
                            ),
                            li: ({ node: _node, ...props }) => <li className="my-1" {...props} />,
                            p: ({ node: _node, ...props }) => <p className="my-2" {...props} />,
                          }}
                        >
                          {message.content}
                        </ReactMarkdown>
                      </div>
                    </div>
                  ) : (
                    <div className="text-right">
                      <div className="inline-block bg-[#343541] px-4 py-2 rounded-2xl text-left transition-all duration-200 hover:bg-[#404150] hover:scale-[1.02]">
                        {message.content}
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* AI Response Options */}
              {showResponseOptions && responseOptions.length > 0 && (
                <div className="flex items-start animate-in slide-in-from-bottom-4 duration-700">
                  <div className="shrink-0 w-9 h-9 bg-[#1a7f64] rounded-full flex items-center justify-center mr-4 text-sm font-medium transition-all duration-300 hover:scale-110 hover:shadow-lg hover:shadow-[#1a7f64]/30">
                    AI
                  </div>
                  <div className="flex flex-col space-y-3 w-full">
                    {/* Ranking Mode */}
                    {responseMode === "ranking" ? (
                      rankedOptions.map((optionId, index) => {
                        const option = responseOptions.find((o) => o.id === optionId);
                        if (!option) return null;
                        const rank = index + 1;

                        return (
                          <div
                            key={option.id}
                            className="bg-[#2a2a2a] px-4 py-3 rounded-xl transition-all duration-300 flex flex-col animate-in slide-in-from-left-2 border-l-4"
                            style={{
                              animationDelay: `${index * 100}ms`,
                              borderLeftColor:
                                rank === 1
                                  ? "#ffd700"
                                  : rank === 2
                                  ? "#c0c0c0"
                                  : rank === 3
                                  ? "#cd7f32"
                                  : "#4a4a4a",
                            }}
                          >
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <div
                                  className={cn(
                                    "flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold",
                                    rank === 1
                                      ? "bg-yellow-500 text-black"
                                      : rank === 2
                                      ? "bg-gray-400 text-black"
                                      : rank === 3
                                      ? "bg-amber-600 text-white"
                                      : "bg-[#404040] text-zinc-300"
                                  )}
                                >
                                  {rank === 1 && <Trophy className="h-4 w-4" />}
                                  {rank !== 1 && rank}
                                </div>
                                <span className="text-sm font-medium">
                                  {rank}
                                  {getOrdinalSuffix(rank)} Place
                                </span>
                              </div>
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 transition-all duration-200 hover:scale-110 disabled:opacity-30"
                                  onClick={() => moveResponseUp(option.id)}
                                  disabled={index === 0}
                                >
                                  <ChevronUp className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 transition-all duration-200 hover:scale-110 disabled:opacity-30"
                                  onClick={() => moveResponseDown(option.id)}
                                  disabled={index === rankedOptions.length - 1}
                                >
                                  <ChevronDown className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>

                            <div className="prose prose-invert max-w-none">
                              {option.content.startsWith("API Raw Data:") ? (
                                <pre className="text-xs overflow-auto max-h-[400px] p-2 bg-[#1e1e1e] rounded">
                                  {option.content.replace("API Raw Data: ", "")}
                                </pre>
                              ) : option.content.startsWith("Collection ") &&
                                option.content.includes(": Error") ? (
                                <p>{option.content}</p>
                              ) : (
                                <ReactMarkdown
                                  remarkPlugins={[remarkGfm]}
                                  components={{
                                    strong: ({ node: _node, ...props }) => (
                                      <span className="font-bold text-[#4fd1c5]" {...props} />
                                    ),
                                    h1: ({ node: _node, ...props }) => (
                                      <h1 className="text-xl font-bold mt-4 mb-2" {...props} />
                                    ),
                                    h2: ({ node: _node, ...props }) => (
                                      <h2 className="text-lg font-bold mt-3 mb-2" {...props} />
                                    ),
                                    h3: ({ node: _node, ...props }) => (
                                      <h3 className="text-md font-bold mt-3 mb-1" {...props} />
                                    ),
                                    ul: ({ node: _node, ...props }) => (
                                      <ul className="list-disc pl-5 my-2 space-y-1" {...props} />
                                    ),
                                    ol: ({ node: _node, ...props }) => (
                                      <ol className="list-decimal pl-5 my-2 space-y-1" {...props} />
                                    ),
                                    li: ({ node: _node, ...props }) => (
                                      <li className="my-1" {...props} />
                                    ),
                                    p: ({ node: _node, ...props }) => <p className="my-2" {...props} />,
                                  }}
                                >
                                  {option.content}
                                </ReactMarkdown>
                              )}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      // Manual and Scoring Modes
                      responseOptions.map((option, index) => (
                        <div
                          key={option.id}
                          className={cn(
                            "bg-[#2a2a2a] px-4 py-3 rounded-xl transition-all duration-300 flex flex-col animate-in slide-in-from-left-2",
                            responseMode === "manual" &&
                              "hover:bg-[#3a3a3a] cursor-pointer hover:scale-[1.01] hover:shadow-lg hover:shadow-[#1a7f64]/10 active:scale-[0.99]"
                          )}
                          style={{ animationDelay: `${index * 100}ms` }}
                          onClick={
                            responseMode === "manual"
                              ? () => selectResponseOption(option.id)
                              : undefined
                          }
                        >
                          <div className="flex items-start">
                            <div className="prose prose-invert max-w-none flex-1">
                              {option.content.startsWith("API Raw Data:") ? (
                                <pre className="text-xs overflow-auto max-h-[400px] p-2 bg-[#1e1e1e] rounded">
                                  {option.content.replace("API Raw Data: ", "")}
                                </pre>
                              ) : option.content.startsWith("Collection ") &&
                                option.content.includes(": Error") ? (
                                <p>{option.content}</p>
                              ) : (
                                <ReactMarkdown
                                  remarkPlugins={[remarkGfm]}
                                  components={{
                                    strong: ({ node: _node, ...props }) => (
                                      <span className="font-bold text-[#4fd1c5]" {...props} />
                                    ),
                                    h1: ({ node: _node, ...props }) => (
                                      <h1 className="text-xl font-bold mt-4 mb-2" {...props} />
                                    ),
                                    h2: ({ node: _node, ...props }) => (
                                      <h2 className="text-lg font-bold mt-3 mb-2" {...props} />
                                    ),
                                    h3: ({ node: _node, ...props }) => (
                                      <h3 className="text-md font-bold mt-3 mb-1" {...props} />
                                    ),
                                    ul: ({ node: _node, ...props }) => (
                                      <ul className="list-disc pl-5 my-2 space-y-1" {...props} />
                                    ),
                                    ol: ({ node: _node, ...props }) => (
                                      <ol className="list-decimal pl-5 my-2 space-y-1" {...props} />
                                    ),
                                    li: ({ node: _node, ...props }) => (
                                      <li className="my-1" {...props} />
                                    ),
                                    p: ({ node: _node, ...props }) => <p className="my-2" {...props} />,
                                  }}
                                >
                                  {option.content}
                                </ReactMarkdown>
                              )}
                            </div>
                            {responseMode === "manual" && (
                              <div className="opacity-0 group-hover:opacity-100 transition-all duration-300 ml-2 mt-1 transform group-hover:scale-110">
                                <Check className="h-4 w-4 text-[#1a7f64]" />
                              </div>
                            )}
                          </div>

                          {/* Scoring Interface */}
                          {responseMode === "scoring" && (
                            <div className="mt-3 pt-3 border-t border-[#3a3a3a]">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs text-zinc-400">
                                  Rate this response (1-10):
                                </span>
                                {scoredOptions.get(option.id) && (
                                  <span className="text-xs font-medium text-[#1a7f64]">
                                    Scored: {scoredOptions.get(option.id)}/10
                                  </span>
                                )}
                              </div>
                              <div className="flex gap-1 flex-wrap">
                                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => {
                                  const isSelected =
                                    scoredOptions.get(option.id) === score;
                                  return (
                                    <Button
                                      key={score}
                                      variant="ghost"
                                      size="sm"
                                      className={cn(
                                        "h-8 w-8 p-0 text-xs transition-all duration-200 hover:scale-110 active:scale-95",
                                        isSelected
                                          ? "bg-[#1a7f64] text-white hover:bg-[#18735a]"
                                          : "bg-[#1a1a1a] hover:bg-[#2a2a2a] text-zinc-300"
                                      )}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        scoreResponseOption(option.id, score);
                                      }}
                                    >
                                      {score}
                                    </Button>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      ))
                    )}

                    {/* Action buttons and instructions */}
                    <div className="flex flex-col gap-2">
                      {responseMode === "ranking" && rankedOptions.length > 0 && (
                        <Button
                          onClick={confirmRanking}
                          className="bg-[#1a7f64] hover:bg-[#18735a] transition-all duration-200 hover:scale-105 hover:shadow-lg"
                        >
                          Select Top Ranked Response
                        </Button>
                      )}

                      <div className="text-xs text-zinc-500 italic pl-1 animate-in fade-in duration-1000">
                        {responseMode === "manual"
                          ? "Select the preferred response from the provided options."
                          : responseMode === "scoring"
                          ? allOptionsScored
                            ? "All responses scored! The highest scored response will be automatically selected."
                            : "Score each response from 1-10. The highest scored response will be automatically selected."
                          : "Use the arrows to rank responses from best (1st) to worst. The top-ranked response will be selected."}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {isLoading && (
                <div className="flex items-start animate-in slide-in-from-bottom-2 duration-500">
                  <div className="shrink-0 w-9 h-9 bg-[#1a7f64] rounded-full flex items-center justify-center mr-4 text-sm font-medium animate-pulse">
                    AI
                  </div>
                  <div className="flex space-x-2">
                    <div
                      className="w-2 h-2 rounded-full bg-zinc-400 animate-bounce"
                      style={{ animationDelay: "0ms" }}
                    ></div>
                    <div
                      className="w-2 h-2 rounded-full bg-zinc-400 animate-bounce"
                      style={{ animationDelay: "150ms" }}
                    ></div>
                    <div
                      className="w-2 h-2 rounded-full bg-zinc-400 animate-bounce"
                      style={{ animationDelay: "300ms" }}
                    ></div>
                  </div>
                </div>
              )}

              {(!activeChat || activeChat?.messages?.length === 0) &&
                !isLoading &&
                !showResponseOptions && (
                  <div className="flex flex-col items-center justify-center py-12 animate-in fade-in duration-1000">
                    {!activeChat ? (
                      <>
                        <h2 className="text-xl font-medium">Welcome to your Chat</h2>
                        <p className="text-zinc-400 mt-2">
                          Create a new chat to get started
                        </p>
                      </>
                    ) : (
                      <>
                        <h2 className="text-xl font-medium">
                          Start a new conversation
                        </h2>
                        <p className="text-zinc-400 mt-2">
                          Send a message to get started
                        </p>
                      </>
                    )}
                  </div>
                )}

              {/* Auto-scroll anchor */}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Input Form */}
          <div className="border-t border-[#2a2a2a] p-4 pb-6 bg-gradient-to-b from-[#0a0a0a] to-[#111111]">
            <div className="max-w-3xl mx-auto">
              <form
                onSubmit={handleSubmit}
                className="flex items-end space-x-2 relative"
              >
                <div className="flex-1 relative shadow-lg">
                  <Input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="Send a message..."
                    className="py-6 px-5 pr-12 bg-[#2a2a2a] text-[#ececf1] border-none rounded-2xl focus-visible:ring-1 focus-visible:ring-[#1a7f64] focus-visible:ring-offset-0 h-auto text-sm shadow-inner transition-all duration-200 focus:scale-[1.01] focus:shadow-lg focus:shadow-[#1a7f64]/20"
                    disabled={isLoading || showResponseOptions}
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-[#2d2d2d] to-[#2a2a2a] rounded-2xl opacity-30 pointer-events-none transition-opacity duration-200"></div>
                </div>
                <Button
                  type="submit"
                  size="icon"
                  disabled={!inputValue.trim() || isLoading || showResponseOptions}
                  className="bg-[#1a7f64] hover:bg-[#18735a] rounded-full h-12 w-12 shadow-md transition-all duration-200 hover:scale-110 hover:shadow-lg hover:shadow-[#1a7f64]/40 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 group"
                >
                  <Send className="h-5 w-5 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  <span className="sr-only">Send</span>
                </Button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
