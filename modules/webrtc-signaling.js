/**
 * Simple WebRTC signaling service
 */

// In-memory registry for WebRTC peers
const registry = {
    peers: {},
    offers: {},
    answers: {},
    candidates: {}
};

// Default room name
const DEFAULT_ROOM = 'soundstage-default';

// Create a singleton signaling service
const signaling = {
    // Generate a random peer ID when service is created
    peerId: 'peer-' + Math.random().toString(36).substring(2, 9),
    
    // Current room
    roomId: DEFAULT_ROOM,
    
    // Callback registrations
    offerCallbacks: [],
    answerCallbacks: [],
    candidateCallbacks: [],
    
    // Join a room
    joinRoom(roomId = DEFAULT_ROOM) {
        this.roomId = roomId;
        
        // Register this peer
        if (!registry.peers[this.roomId]) {
            registry.peers[this.roomId] = [];
        }
        
        if (!registry.peers[this.roomId].includes(this.peerId)) {
            registry.peers[this.roomId].push(this.peerId);
        }

        // Start checking for messages
        if (!this.interval) {
            this.interval = setInterval(() => this.checkMessages(), 500);
        }
        
        return this.peerId;
    },
    
    // Leave current room
    leaveRoom() {
        // Remove peer from room
        if (registry.peers[this.roomId]) {
            const index = registry.peers[this.roomId].indexOf(this.peerId);
            if (index !== -1) {
                registry.peers[this.roomId].splice(index, 1);
            }
        }
        
        // Clean up offers and answers
        if (registry.offers[this.roomId]) {
            delete registry.offers[this.roomId][this.peerId];
        }
        
        if (registry.answers[this.roomId]) {
            delete registry.answers[this.roomId][this.peerId];
        }
        
        if (registry.candidates[this.roomId]) {
            delete registry.candidates[this.roomId][this.peerId];
        }
        
        // Stop checking for messages
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
    },
    
    // Register offer callback
    onOffer(callback) {
        this.offerCallbacks.push(callback);
    },
    
    // Register answer callback
    onAnswer(callback) {
        this.answerCallbacks.push(callback);
    },
    
    // Register candidate callback
    onCandidate(callback) {
        this.candidateCallbacks.push(callback);
    },
    
    // Send an offer to the room
    sendOffer(offer) {
        if (!registry.offers[this.roomId]) {
            registry.offers[this.roomId] = {};
        }
        
        registry.offers[this.roomId][this.peerId] = { offer };
    },
    
    // Send an answer to a specific peer
    sendAnswer(targetPeerId, answer) {
        if (!registry.answers[this.roomId]) {
            registry.answers[this.roomId] = {};
        }
        
        if (!registry.answers[this.roomId][targetPeerId]) {
            registry.answers[this.roomId][targetPeerId] = {};
        }
        
        registry.answers[this.roomId][targetPeerId][this.peerId] = { answer };
    },
    
    // Send an ICE candidate to a specific peer
    sendCandidate(targetPeerId, candidate) {
        if (!registry.candidates[this.roomId]) {
            registry.candidates[this.roomId] = {};
        }
        
        if (!registry.candidates[this.roomId][targetPeerId]) {
            registry.candidates[this.roomId][targetPeerId] = {};
        }
        
        if (!registry.candidates[this.roomId][targetPeerId][this.peerId]) {
            registry.candidates[this.roomId][targetPeerId][this.peerId] = [];
        }
        
        registry.candidates[this.roomId][targetPeerId][this.peerId].push({ candidate });
    },
    
    // Check for new messages
    checkMessages() {
        // Check for offers
        if (registry.offers[this.roomId]) {
            for (const peerId in registry.offers[this.roomId]) {
                if (peerId !== this.peerId) {
                    const data = registry.offers[this.roomId][peerId];
                    this.offerCallbacks.forEach(callback => callback(peerId, data.offer));
                }
            }
        }
        
        // Check for answers to our offers
        if (registry.answers[this.roomId] && registry.answers[this.roomId][this.peerId]) {
            for (const peerId in registry.answers[this.roomId][this.peerId]) {
                const data = registry.answers[this.roomId][this.peerId][peerId];
                this.answerCallbacks.forEach(callback => callback(peerId, data.answer));
                
                // Remove processed answer
                delete registry.answers[this.roomId][this.peerId][peerId];
            }
        }
        
        // Check for candidates
        if (registry.candidates[this.roomId] && registry.candidates[this.roomId][this.peerId]) {
            for (const peerId in registry.candidates[this.roomId][this.peerId]) {
                const candidates = registry.candidates[this.roomId][this.peerId][peerId];
                
                candidates.forEach(data => {
                    this.candidateCallbacks.forEach(callback => callback(peerId, data.candidate));
                });
                
                // Remove processed candidates
                registry.candidates[this.roomId][this.peerId][peerId] = [];
            }
        }
    },
    
    // Get the list of peers in the current room
    getPeers() {
        return registry.peers[this.roomId] ? 
            registry.peers[this.roomId].filter(id => id !== this.peerId) : 
            [];
    }
};

// Export the singleton
export default signaling;