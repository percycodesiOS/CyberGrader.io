rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    match /{document=**} { allow read, write: if false; }

    function isSignedIn() { return request.auth != null; }
    function isValidId(id) { return id is string && id.size() <= 128 && id.matches('^[a-zA-Z0-9_\\-]+$'); }
    function incoming() { return request.resource.data; }
    function existing() { return resource.data; }
    function isOwner(userId) { return isSignedIn() && request.auth.uid == userId; }
    function isAdmin() {
      return isSignedIn() && (
        exists(/databases/$(database)/documents/users/$(request.auth.uid)) &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin' ||
        request.auth.token.email == "kmacek715@gmail.com"
      );
    }

    function isValidUser(data) {
      return data.keys().hasAll(['displayName', 'email', 'role', 'uid']) &&
             data.displayName is string && data.displayName.size() <= 100 &&
             data.email is string && data.email.size() <= 256 &&
             data.role in ['student', 'teacher', 'admin'] &&
             data.uid == request.auth.uid;
    }
    function isValidGameTemplate(data) {
      return data.keys().hasAll(['name', 'creatorId', 'creatorName', 'createdAt', 'updatedAt', 'config', 'status', 'isPublic']) &&
             data.name is string && data.name.size() > 0 && data.name.size() <= 100 &&
             data.creatorId == request.auth.uid &&
             data.creatorName is string && data.creatorName.size() <= 100 &&
             data.createdAt is timestamp && data.updatedAt is timestamp &&
             data.config is map &&
             data.status in ['draft', 'pending', 'approved', 'rejected'] &&
             data.isPublic is bool && data.isPublic == (data.status == 'approved');
    }
    function isAllowedStatusForRole(s) { return s in ['draft', 'pending'] || isAdmin(); }
    function isValidRoom(data) {
      return data.keys().hasAll(['gameId', 'hostId', 'status', 'players', 'playerUids', 'state', 'createdAt']) &&
             data.gameId is string && data.hostId is string &&
             data.status in ['lobby', 'playing', 'finished'] &&
             data.players is list && data.players.size() <= 40 &&
             data.playerUids is list && data.playerUids.size() <= 40 &&
             data.state is map && data.createdAt is timestamp;
    }
    function isValidMessage(data) {
      return data.keys().hasAll(['senderId', 'senderName', 'text', 'createdAt', 'type']) &&
             data.senderId == request.auth.uid &&
             data.senderName is string &&
             data.text is string && data.text.size() <= 1000 &&
             data.createdAt == request.time && data.type in ['chat', 'system'];
    }

    match /users/{userId} {
      allow get: if isOwner(userId) || isAdmin();
      allow list: if isAdmin();
      allow create: if isOwner(userId) && isValidUser(incoming()) && (incoming().role == 'student' || isAdmin());
      allow update: if isOwner(userId) && (
        incoming().diff(existing()).affectedKeys().hasOnly(['displayName', 'photoURL']) || isAdmin()
      ) && isValidUser(incoming());
    }

    match /games/{gameId} {
      allow get: if isSignedIn() && isValidId(gameId) && (existing().status == 'approved' || existing().creatorId == request.auth.uid || isAdmin());
      allow list: if isSignedIn() && (resource.data.status == 'approved' || resource.data.creatorId == request.auth.uid || isAdmin());
      allow create: if isSignedIn() && isValidId(gameId) && isValidGameTemplate(incoming()) && incoming().createdAt == request.time && isAllowedStatusForRole(incoming().status);
      allow update: if isSignedIn() && isValidId(gameId) && (
        (existing().creatorId == request.auth.uid && incoming().creatorId == existing().creatorId && incoming().createdAt == existing().createdAt && isAllowedStatusForRole(incoming().status)) || isAdmin()
      ) && isValidGameTemplate(incoming()) && incoming().updatedAt == request.time;
      allow delete: if isSignedIn() && isValidId(gameId) && (existing().creatorId == request.auth.uid || isAdmin());
    }

    match /rooms/{roomId} {
      allow get: if isSignedIn() && isValidId(roomId);
      allow list: if isSignedIn();
      allow create: if isSignedIn() && isValidId(roomId) && isValidRoom(incoming()) && incoming().hostId == request.auth.uid && incoming().createdAt == request.time;

      // CHANGED FOR GAMEBASH WEB: any signed-in classmate can join a room and
      // move pieces / roll dice. This is what lets students join a game they
      // didn't create. Low stakes (classroom), still requires being signed in.
      allow update: if isSignedIn() && isValidId(roomId) && isValidRoom(incoming());

      allow delete: if isSignedIn() && isValidId(roomId) && (existing().hostId == request.auth.uid || isAdmin());

      match /messages/{messageId} {
        allow read: if isSignedIn();
        allow create: if isSignedIn() && isValidId(messageId) && isValidMessage(incoming());
      }
    }
  }
}
