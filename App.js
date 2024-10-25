// Importation des modules nécessaires de React et React Native
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Button,
  Modal,
  Alert,
  ScrollView,
} from "react-native";
import { Calendar } from "react-native-calendars";
import { LinearGradient } from "expo-linear-gradient";
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";
//import { getAnalytics } from "firebase/analytics";

// Configuration Firebase (à ajouter après les imports)
const firebaseConfig = {
  apiKey: "AIzaSyCI7Ajf_9i7LRXeEOxxtNnF5S-x88KgvDw",
  authDomain: "pilates-ee95b.firebaseapp.com",
  projectId: "pilates-ee95b",
  storageBucket: "pilates-ee95b.appspot.com",
  messagingSenderId: "406434228854",
  appId: "1:406434228854:web:d7eace586a578698accd57",
  measurementId: "G-53NS286B1Z",
};
// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export default function App() {
  // Définition des états (variables qui peuvent changer et déclencher un re-rendu)
  const [users, setUsers] = useState([]); // Assurez-vous que cet état existe
  const [isLoggedIn, setIsLoggedIn] = useState(false); // État de connexion de l'utilisateur
  const [isAdmin, setIsAdmin] = useState(false); // Indique si l'utilisateur est un administrateur
  const [currentUser, setCurrentUser] = useState(null); // Utilisateur actuellement connecté
  const [username, setUsername] = useState(""); // Nom d'utilisateur saisi
  const [password, setPassword] = useState(""); // Mot de passe saisi
  const [selectedDate, setSelectedDate] = useState(""); // Date sélectionnée dans le calendrier
  const [classes, setClasses] = useState({}); // Objet contenant les cours, organisés par date
  const [showUserModal, setShowUserModal] = useState(false); // Contrôle l'affichage du modal d'ajout d'utilisateur
  const [newUser, setNewUser] = useState({
    username: "",
    password: "",
    isAdmin: false,
  }); // Nouvel utilisateur à ajouter
  const [showEnrolledModal, setShowEnrolledModal] = useState(false); // Contrôle l'affichage du modal des inscrits
  const [selectedClass, setSelectedClass] = useState(null); // Cours sélectionné pour voir les inscrits
  const [showClassModal, setShowClassModal] = useState(false); // Contrôle l'affichage du modal d'ajout de cours
  const [newClass, setNewClass] = useState({
    name: "",
    time: "",
    duration: "",
    capacity: "",
  }); // Nouveau cours à ajouter
  // Ajoutez un useEffect pour charger les utilisateurs au démarrage
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // 1. Vérifier et initialiser les utilisateurs par défaut si nécessaire
        const usersRef = collection(db, "users");
        const snapshot = await getDocs(usersRef);

        if (snapshot.empty) {
          console.log("Création des utilisateurs par défaut");
          // Créer les utilisateurs par défaut si aucun n'existe
          await addDoc(usersRef, {
            username: "admin",
            password: "admin123",
            isAdmin: true,
          });

          await addDoc(usersRef, {
            username: "user",
            password: "password",
            isAdmin: false,
          });

          // Recharger les utilisateurs après création
          const newSnapshot = await getDocs(usersRef);
          const usersList = newSnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          setUsers(usersList);
        } else {
          console.log("Chargement des utilisateurs existants");
          const usersList = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          setUsers(usersList);
        }

        // 2. Charger les cours si une date est sélectionnée
        if (selectedDate) {
          await loadClasses(selectedDate);
        }
      } catch (error) {
        console.error("Erreur d'initialisation:", error);
        Alert.alert(
          "Erreur",
          "Erreur lors de l'initialisation de l'application"
        );
      }
    };

    initializeApp();
  }, [selectedDate]); // Dépendance à selectedDate pour recharger les cours quand la date change
  // Fonction de gestion de la connexion
  const handleLogin = async () => {
    try {
      const usersRef = collection(db, "users");
      const snapshot = await getDocs(usersRef);
      const user = snapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .find((u) => u.username === username && u.password === password);

      if (user) {
        setIsLoggedIn(true);
        setIsAdmin(user.isAdmin);
        setCurrentUser(user);
      } else {
        Alert.alert("Erreur", "Identifiants incorrects");
      }
    } catch (error) {
      Alert.alert("Erreur", "Erreur de connexion");
    }
  };

  // Fonction de déconnexion
  const handleLogout = () => {
    setIsLoggedIn(false);
    setIsAdmin(false);
    setCurrentUser(null);
    setUsername("");
    setPassword("");
  };

  // Fonction pour ajouter un nouvel utilisateur
  const addUser = async () => {
    try {
      const usersRef = collection(db, "users");
      await addDoc(usersRef, newUser);
      setNewUser({ username: "", password: "", isAdmin: false });
      setShowUserModal(false);
    } catch (error) {
      Alert.alert("Erreur", "Erreur lors de l'ajout de l'utilisateur");
    }
  };

  // Fonction pour supprimer un utilisateur
  const deleteUser = async (id) => {
    try {
      const userRef = doc(db, "users", id);
      await deleteDoc(userRef);
    } catch (error) {
      Alert.alert("Erreur", "Erreur lors de la suppression de l'utilisateur");
    }
  };

  // Fonction pour charger les cours d'une date spécifique
  const setSelectedDateAndload = (date) => {
    setSelectedDate(date);
  };

  // Fonction appelée lorsqu'une date est sélectionnée dans le calendrier
  const onDayPress = (day) => {
    setSelectedDateAndload(day.dateString);
  };

  // Fonction pour mettre à jour le statut d'un cours en fonction du nombre d'inscrits
  const updateClassStatus = (classItem) => {
    if (classItem.enrolled.length >= classItem.capacity) {
      return "Complet";
    } else if (classItem.enrolled.length >= classItem.capacity * 0.8) {
      return "Presque complet";
    } else {
      return "Disponible";
    }
  };

  // Fonction pour gérer la réservation d'un cours par un utilisateur
  const handleReservation = async (classItem) => {
    try {
      if (classItem.enrolled.includes(currentUser.id)) {
        Alert.alert("Erreur", "Vous êtes déjà inscrit à ce cours.");
        return;
      }

      if (classItem.enrolled.length >= classItem.capacity) {
        Alert.alert("Erreur", "Ce cours est complet.");
        return;
      }

      const classRef = doc(db, "classes", classItem.id);
      const updatedEnrolled = [...classItem.enrolled, currentUser.id];
      await updateDoc(classRef, {
        enrolled: updatedEnrolled,
        status: updateClassStatus({ ...classItem, enrolled: updatedEnrolled }),
      });

      await loadClasses(selectedDate); // Recharger les cours
      Alert.alert("Succès", "Vous êtes inscrit au cours.");
    } catch (error) {
      Alert.alert("Erreur", "Erreur lors de la réservation");
    }
  };

  // Fonction pour ajouter un nouveau cours
  const addClass = async () => {
    try {
      const classesRef = collection(db, "classes");
      const newClassItem = {
        ...newClass,
        date: selectedDate,
        enrolled: [],
        status: "Disponible",
        capacity: parseInt(newClass.capacity),
      };
      await addDoc(classesRef, newClassItem);
      setNewClass({ name: "", time: "", duration: "", capacity: "" });
      setShowClassModal(false);
    } catch (error) {
      Alert.alert("Erreur", "Erreur lors de l'ajout du cours");
    }
  };
  // Ajoutez une fonction pour charger les cours
  const loadClasses = async (date) => {
    try {
      const classesRef = collection(db, "classes");
      const snapshot = await getDocs(classesRef);
      const classesData = {};
      snapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .forEach((classItem) => {
          if (classItem.date === date) {
            if (!classesData[date]) {
              classesData[date] = [];
            }
            classesData[date].push(classItem);
          }
        });
      setClasses(classesData);
    } catch (error) {
      Alert.alert("Erreur", "Erreur lors du chargement des cours");
    }
  };
  // Fonction pour supprimer un cours
  const deleteClass = async (classId) => {
    try {
      const classRef = doc(db, "classes", classId);
      await deleteDoc(classRef);
      await loadClasses(selectedDate); // Recharger les cours après suppression
    } catch (error) {
      Alert.alert("Erreur", "Erreur lors de la suppression du cours");
    }
  };

  // Composant pour rendre un élément de cours dans la liste
  const renderClass = ({ item }) => (
    <View style={styles.classItem}>
      <Text style={styles.className}>{item.name}</Text>
      <Text>
        {item.time} - {item.duration}
      </Text>
      <Text>
        Places: {item.enrolled.length}/{item.capacity}
      </Text>
      <Text style={styles.classStatus}>{item.status}</Text>
      {isAdmin ? (
        <View>
          <Button
            title="Voir inscrits"
            onPress={() => {
              setSelectedClass(item);
              setShowEnrolledModal(true);
            }}
          />
          <Button
            title="Supprimer le cours"
            onPress={() => deleteClass(item.id)}
            color="red"
          />
        </View>
      ) : (
        <Button title="Réserver" onPress={() => handleReservation(item)} />
      )}
    </View>
  );

  // Composant pour rendre un élément utilisateur dans la liste
  const renderUser = ({ item }) => (
    <View style={styles.userItem}>
      <Text>
        {item.username} - {item.isAdmin ? "Admin" : "User"}
      </Text>
      <Button title="Supprimer" onPress={() => deleteUser(item.id)} />
    </View>
  );
  // Rendu conditionnel basé sur l'état de connexion et le type d'utilisateur
  if (!isLoggedIn) {
    // Écran de connexion
    return (
      //<View style={styles.container}>
      <LinearGradient //pour ajouter le dégradé de couleur à l'écran d'acceuil
        colors={["#FFA500", "#B0E2FF"]}
        style={styles.container}
        start={{ x: 0, y: 1 }}
        end={{ x: 0, y: 0 }}
      >
        <View style={styles.contentContainer}>
          <Text style={styles.header}>Connexion</Text>
          <TextInput
            style={styles.input}
            placeholder="Nom d'utilisateur"
            value={username}
            onChangeText={setUsername}
          />
          <TextInput
            style={styles.input}
            placeholder="Mot de passe"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          <Button title="Se connecter" onPress={handleLogin} />
        </View>
      </LinearGradient>
    );
  }

  if (isAdmin) {
    // Interface administrateur
    return (
      <LinearGradient //pour ajouter le dégradé de couleur à l'écran admin
        colors={["#FFA500", "#B0E2FF"]}
        style={styles.container}
        start={{ x: 0, y: 1 }}
        end={{ x: 0, y: 0 }}
      >
        <ScrollView style={styles.container}>
          <Text style={styles.centeredHeader}>Panneau d'administration</Text>
          <Button
            title="Ajouter un utilisateur"
            onPress={() => setShowUserModal(true)}
          />
          <FlatList
            data={users}
            renderItem={renderUser}
            keyExtractor={(item) => item.id}
          />
          <Text style={styles.centeredHeader}>Cours de Pilates</Text>
          <Calendar onDayPress={onDayPress} />
          <Button
            title="Ajouter un cours"
            onPress={() => setShowClassModal(true)}
          />
          <FlatList
            data={classes[selectedDate] || []}
            renderItem={renderClass}
            keyExtractor={(item) => item.id}
          />
          <Button title="Se déconnecter" onPress={handleLogout} />

          {/* Modal pour ajouter un utilisateur */}
          <Modal visible={showUserModal} animationType="slide">
            <View style={styles.modalContent}>
              <TextInput
                style={styles.input}
                placeholder="Nom d'utilisateur"
                value={newUser.username}
                onChangeText={(text) =>
                  setNewUser({ ...newUser, username: text })
                }
              />
              <TextInput
                style={styles.input}
                placeholder="Mot de passe"
                value={newUser.password}
                onChangeText={(text) =>
                  setNewUser({ ...newUser, password: text })
                }
                secureTextEntry
              />
              <TouchableOpacity
                style={styles.checkboxContainer}
                onPress={() =>
                  setNewUser({ ...newUser, isAdmin: !newUser.isAdmin })
                }
              >
                <Text>Admin</Text>
                <View
                  style={[styles.checkbox, newUser.isAdmin && styles.checked]}
                />
              </TouchableOpacity>
              <Button title="Ajouter" onPress={addUser} />
              <Button title="Annuler" onPress={() => setShowUserModal(false)} />
            </View>
          </Modal>

          {/* Modal pour voir les inscrits à un cours */}
          <Modal visible={showEnrolledModal} animationType="slide">
            <View style={styles.modalContent}>
              <Text style={styles.header}>
                Inscrits au cours {selectedClass?.name}
              </Text>
              <FlatList
                data={
                  selectedClass
                    ? users.filter((u) => selectedClass.enrolled.includes(u.id))
                    : []
                }
                renderItem={({ item }) => <Text>{item.username}</Text>}
                keyExtractor={(item) => item.id}
              />
              <Button
                title="Fermer"
                onPress={() => setShowEnrolledModal(false)}
              />
            </View>
          </Modal>

          {/* Modal pour ajouter un cours */}
          <Modal visible={showClassModal} animationType="slide">
            <View style={styles.modalContent}>
              <TextInput
                style={styles.input}
                placeholder="Nom du cours"
                value={newClass.name}
                onChangeText={(text) =>
                  setNewClass({ ...newClass, name: text })
                }
              />
              <TextInput
                style={styles.input}
                placeholder="Heure (ex: 10:00)"
                value={newClass.time}
                onChangeText={(text) =>
                  setNewClass({ ...newClass, time: text })
                }
              />
              <TextInput
                style={styles.input}
                placeholder="Durée (ex: 60 min)"
                value={newClass.duration}
                onChangeText={(text) =>
                  setNewClass({ ...newClass, duration: text })
                }
              />
              <TextInput
                style={styles.input}
                placeholder="Capacité"
                value={newClass.capacity}
                onChangeText={(text) =>
                  setNewClass({ ...newClass, capacity: text })
                }
                keyboardType="numeric"
              />
              <Button title="Ajouter le cours" onPress={addClass} />
              <Button
                title="Annuler"
                onPress={() => setShowClassModal(false)}
              />
            </View>
          </Modal>
        </ScrollView>
      </LinearGradient>
    );
  }

  // Interface utilisateur normal
  return (
    <LinearGradient
      colors={["#FFA500", "#B0E2FF"]}
      style={styles.container}
      start={{ x: 0, y: 1 }}
      end={{ x: 0, y: 0 }}
    >
      <View style={styles.container}>
        <Text style={styles.centeredHeader}>Cours de Pilates</Text>

        <Calendar
          onDayPress={onDayPress}
          markedDates={{
            [selectedDate]: { selected: true, selectedColor: "blue" },
          }}
        />
        <FlatList
          data={classes[selectedDate] || []}
          renderItem={renderClass}
          keyExtractor={(item) => item.id}
        />
        <Button title="Se déconnecter" onPress={handleLogout} />
      </View>
    </LinearGradient>
  );
}

// Définition des styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    //padding: 10,
  },
  contentContainer: {
    //pour centrer le text Connexion les deux case utilisateurs et le bouton se connecter
    flex: 1,
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  header: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 10,
  },
  centeredHeader: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 10,
    textAlign: "center",
    width: "100%",
  },
  input: {
    height: 40,
    borderColor: "gray",
    borderWidth: 1,
    marginBottom: 10,
    padding: 10,
  },
  classItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
  },
  className: {
    fontSize: 18,
    fontWeight: "bold",
  },
  classStatus: {
    color: "green",
  },
  userItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
  },
  modalContent: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
  },
  checkboxContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  checkbox: {
    //    width: 20,          // Largeur de la case à cocher
    //   height: 20,         // Hauteur de la case à cocher
    //  borderWidth: 1,     // Épaisseur de la bordure
    //   marginLeft: 10,     // Marge à gauche
    //},
    //checked: {
    //   backgroundColor: 'blue',  // Couleur de fond quand la case est cochée
    width: 20,
    height: 20,
    borderWidth: 1,
    borderColor: "#87CEEB", // Bordure bleue
    marginLeft: 10,
    borderRadius: 4, // Coins arrondis optionnels
  },
  checked: {
    backgroundColor: "#FFA500", // Fond orange quand coché
    borderColor: "#FFA500", // Bordure orange quand coché
  },
});

//explique moi comment créer un fichier pour android et pour IOS que les utilisateurs pourront télécharger et installer sur leurs téléphone
