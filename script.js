import { initializeApp } from
"https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";

import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from
"https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

import {
  getFirestore,
  collection,
  addDoc,
  getDoc,
  doc,
  setDoc,
  getDocs,
  query,
  where,
  updateDoc,
  serverTimestamp
} from
"https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

/* FIREBASE CONFIG */

const firebaseConfig = {
  apiKey: "AIzaSyCkivjlMyvCA3dVMzqt4VfBlS45LT0FOba",
  authDomain: "hanafia-future-academy.firebaseapp.com",
  projectId: "hanafia-future-academy",
  storageBucket: "hanafia-future-academy.firebasestorage.app",
  messagingSenderId: "97046937102",
  appId: "1:97046937102:web:38ed6a351b318959c0865f",
  measurementId: "G-MYYT1V0RKK"
};

/* ADMIN UID বসান */

const ADMIN_UID = "YOUR_ADMIN_UID";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const $ = id => document.getElementById(id);

function message(id, text) {
  if ($(id)) $(id).textContent = text;
}

/* DASHBOARD */

function showDashboard(role) {
  [
    "adminDashboard",
    "teacherDashboard",
    "studentDashboard",
    "parentDashboard"
  ].forEach(id => $(id)?.classList.add("hidden"));

  const dashboard = {
    admin: "adminDashboard",
    teacher: "teacherDashboard",
    student: "studentDashboard",
    parent: "parentDashboard"
  };

  if (dashboard[role]) {
    $(dashboard[role])?.classList.remove("hidden");
    $(dashboard[role])?.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }
}

function hideDashboards() {
  showDashboard("");
}

/* LOGIN */

$("loginForm").addEventListener("submit", async e => {
  e.preventDefault();

  const btn = $("loginSubmit");
  btn.disabled = true;
  message("loginMessage", "Login হচ্ছে...");

  try {
    await signInWithEmailAndPassword(
      auth,
      $("email").value.trim(),
      $("password").value
    );

    message("loginMessage", "আলহামদুলিল্লাহ! Login সফল হয়েছে।");

  } catch (error) {
    message("loginMessage", "Login হয়নি: " + error.message);
  } finally {
    btn.disabled = false;
  }
});

/* LOGOUT */

$("logoutBtn").addEventListener("click", async () => {
  try {
    await signOut(auth);
    message("loginMessage", "Logout সফল হয়েছে।");
  } catch (error) {
    message("loginMessage", error.message);
  }
});

/* AUTH CHECK */

onAuthStateChanged(auth, async user => {
  $("logoutBtn").style.display =
    user ? "inline-block" : "none";

  if (!user) {
    hideDashboards();
    return;
  }

  try {
    if (user.uid === ADMIN_UID) {
      showDashboard("admin");
      $("adminInfo").textContent =
        "স্বাগতম, Administrator";

      await loadApplications();
      return;
    }

    const profile = await getDoc(
      doc(db, "user_profiles", user.uid)
    );

    if (!profile.exists()) {
      hideDashboards();
      message(
        "loginMessage",
        "আপনার User Profile পাওয়া যায়নি। Admin-এর সঙ্গে যোগাযোগ করুন।"
      );
      return;
    }

    const data = profile.data();

    if (data.role === "teacher") {
      showDashboard("teacher");
      await loadTeacherClasses(user.uid);

    } else if (data.role === "student") {
      showDashboard("student");
      await loadStudentProfile(user.uid);
      await loadStudentClasses(user.uid);

    } else if (data.role === "parent") {
      showDashboard("parent");
      await loadParentProgress(user.uid);

    } else {
      hideDashboards();
      message("loginMessage", "আপনার Role সঠিক নয়।");
    }

  } catch (error) {
    hideDashboards();
    message("loginMessage", "সমস্যা: " + error.message);
  }
});

/* ADMISSION */

$("admissionForm").addEventListener("submit", async e => {
  e.preventDefault();

  const btn = $("admissionSubmit");
  btn.disabled = true;
  message("aMessage", "আবেদন জমা হচ্ছে...");

  try {
    await addDoc(collection(db, "student_records"), {
      studentName: $("aName").value.trim(),
      fatherName: $("aFather").value.trim(),
      mobile: $("aMobile").value.trim(),
      ageGroup: $("aAge").value,
      course: $("aCourse").value,
      address: $("aAddress").value.trim(),
      status: "pending",
      createdAt: serverTimestamp()
    });

    message(
      "aMessage",
      "আলহামদুলিল্লাহ! ভর্তি আবেদন জমা হয়েছে।"
    );

    $("admissionForm").reset();

  } catch (error) {
    message("aMessage", "আবেদন জমা হয়নি: " + error.message);
  } finally {
    btn.disabled = false;
  }
});

/* FREE TRIAL */

$("trialForm").addEventListener("submit", async e => {
  e.preventDefault();

  const btn = $("trialForm").querySelector("button");
  btn.disabled = true;

  try {
    await addDoc(collection(db, "trial_requests"), {
      studentName: $("trialName").value.trim(),
      guardianName: $("trialGuardian").value.trim(),
      mobile: $("trialMobile").value.trim(),
      course: $("trialCourse").value,
      preferredDate: $("trialDate").value,
      preferredTime: $("trialTime").value,
      status: "pending",
      createdAt: serverTimestamp()
    });

    message(
      "trialMessage",
      "আলহামদুলিল্লাহ! ফ্রি ট্রায়াল আবেদন জমা হয়েছে।"
    );

    $("trialForm").reset();

  } catch (error) {
    message("trialMessage", "সমস্যা: " + error.message);
  } finally {
    btn.disabled = false;
  }
});

/* TEACHER EVALUATION */

$("evaluationForm").addEventListener("submit", async e => {
  e.preventDefault();

  const user = auth.currentUser;

  if (!user) {
    message("evaluationMessage", "আগে Login করুন।");
    return;
  }

  try {
    await addDoc(collection(db, "teacher_evaluations"), {
      teacherId: $("evaluationTeacherUid").value.trim(),
      studentName: $("evaluationStudentName").value.trim(),
      rating: Number($("evaluationRating").value),
      comment: $("evaluationComment").value.trim(),
      submittedBy: user.uid,
      createdAt: serverTimestamp()
    });

    message("evaluationMessage", "মূল্যায়ন জমা হয়েছে।");
    $("evaluationForm").reset();

  } catch (error) {
    message("evaluationMessage", "সমস্যা: " + error.message);
  }
});

/* ADMIN: APPLICATION LIST */

async function loadApplications() {
  const box = $("applicationsList");
  box.textContent = "আবেদন লোড হচ্ছে...";

  const snapshot = await getDocs(
    collection(db, "student_records")
  );

  box.textContent = "";

  if (snapshot.empty) {
    box.textContent = "কোনো আবেদন পাওয়া যায়নি।";
    return;
  }

  snapshot.forEach(item => {
    const data = item.data();

    const card = document.createElement("div");
    card.className = "notice";

    const title = document.createElement("h3");
    title.textContent = data.studentName || "নাম নেই";

    const details = document.createElement("p");
    details.textContent =
      "পিতা: " + (data.fatherName || "") +
      " | মোবাইল: " + (data.mobile || "") +
      " | কোর্স: " + (data.course || "") +
      " | অবস্থা: " + (data.status || "pending");

    card.append(title, details);

    if (data.status !== "approved") {
      const btn = document.createElement("button");
      btn.className = "btn";
      btn.textContent = "অনুমোদন করুন";

      btn.onclick = async () => {
        try {
          await updateDoc(
            doc(db, "student_records", item.id),
            { status: "approved" }
          );

          await loadApplications();
        } catch (error) {
          alert("সমস্যা: " + error.message);
        }
      };

      card.append(btn);
    }

    box.append(card);
  });
}

/* ADMIN: USER PROFILE */

$("profileForm").addEventListener("submit", async e => {
  e.preventDefault();

  try {
    await setDoc(
      doc(db, "user_profiles", $("profileUid").value.trim()),
      {
        name: $("profileName").value.trim(),
        email: $("profileEmail").value.trim(),
        role: $("profileRole").value,
        createdAt: serverTimestamp()
      }
    );

    message("profileMessage", "Profile তৈরি হয়েছে।");
    $("profileForm").reset();

  } catch (error) {
    message("profileMessage", "সমস্যা: " + error.message);
  }
});

/* CREATE ZOOM CLASS */

function safeZoomLink(value) {
  try {
    const url = new URL(value);

    return url.protocol === "https:" &&
      (url.hostname === "zoom.us" ||
       url.hostname.endsWith(".zoom.us"));

  } catch {
    return false;
  }
}

$("classForm").addEventListener("submit", async e => {
  e.preventDefault();

  const link = $("zoomLink").value.trim();

  if (!safeZoomLink(link)) {
    message("classMessage", "সঠিক Zoom Link দিন।");
    return;
  }

  try {
    const studentIds = $("classStudents").value
      .split(",")
      .map(x => x.trim())
      .filter(Boolean);

    await addDoc(collection(db, "classes"), {
      title: $("classTitle").value.trim(),
      course: $("classCourse").value,
      teacherId: $("classTeacher").value.trim(),
      studentIds,
      classDate: $("classDate").value,
      zoomLink: link,
      createdAt: serverTimestamp()
    });

    message("classMessage", "Zoom Class তৈরি হয়েছে।");
    $("classForm").reset();

  } catch (error) {
    message("classMessage", "সমস্যা: " + error.message);
  }
});

/* TEACHER CLASSES */

async function loadTeacherClasses(uid) {
  const box = $("teacherClasses");
  box.textContent = "ক্লাস লোড হচ্ছে...";

  const q = query(
    collection(db, "classes"),
    where("teacherId", "==", uid)
  );

  const snapshot = await getDocs(q);
  box.textContent = "";

  if (snapshot.empty) {
    box.textContent = "আপনার কোনো ক্লাস নেই।";
    return;
  }

  snapshot.forEach(item => {
    const data = item.data();
    const card = document.createElement("div");
    card.className = "notice";

    const title = document.createElement("h3");
    title.textContent = data.title || "ক্লাস";

    const date = document.createElement("p");
    date.textContent = "সময়: " + (data.classDate || "");

    const link = document.createElement("a");
    link.className = "btn";
    link.textContent = "Join Zoom Class";
    link.href = data.zoomLink;
    link.target = "_blank";
    link.rel = "noopener";

    const id = document.createElement("p");
    id.textContent = "Class ID: " + item.id;

    card.append(title, date, link, id);
    box.append(card);
  });
}

/* STUDENT PROFILE */

async function loadStudentProfile(uid) {
  const box = $("studentInfo");

  const snap = await getDoc(
    doc(db, "user_profiles", uid)
  );

  if (!snap.exists()) {
    box.textContent = "Profile পাওয়া যায়নি।";
    return;
  }

  const data = snap.data();

  box.textContent =
    "নাম: " + (data.name || "") +
    " | Email: " + (data.email || "");
}

/* STUDENT CLASSES */

async function loadStudentClasses(uid) {
  const box = $("studentClasses");
  box.textContent = "ক্লাস লোড হচ্ছে...";

  const q = query(
    collection(db, "classes"),
    where("studentIds", "array-contains", uid)
  );

  const snapshot = await getDocs(q);
  box.textContent = "";

  if (snapshot.empty) {
    box.textContent = "আপনার কোনো ক্লাস নির্ধারণ করা হয়নি।";
    return;
  }

  snapshot.forEach(item => {
    const data = item.data();
    const card = document.createElement("div");
    card.className = "notice";

    const title = document.createElement("h3");
    title.textContent = data.title || "ক্লাস";

    const date = document.createElement("p");
    date.textContent = "সময়: " + (data.classDate || "");

    const link = document.createElement("a");
    link.className = "btn";
    link.textContent = "Join Zoom Class";
    link.href = data.zoomLink;
    link.target = "_blank";
    link.rel = "noopener";

    card.append(title, date, link);
    box.append(card);
  });
}

/* ATTENDANCE */

$("attendanceForm").addEventListener("submit", async e => {
  e.preventDefault();

  const user = auth.currentUser;
  if (!user) return;

  try {
    const classId = $("attendanceClassId").value.trim();
    const studentId = $("attendanceStudentId").value.trim();

    const classSnap = await getDoc(
      doc(db, "classes", classId)
    );

    if (!classSnap.exists()) {
      message("attendanceMessage", "ক্লাস পাওয়া যায়নি।");
      return;
    }

    const classData = classSnap.data();

    if (
      classData.teacherId !== user.uid ||
      !(classData.studentIds || []).includes(studentId)
    ) {
      message("attendanceMessage", "অনুমতি নেই।");
      return;
    }

    await addDoc(collection(db, "attendance"), {
      classId,
      studentId,
      teacherId: user.uid,
      status: $("attendanceStatus").value,
      createdAt: serverTimestamp()
    });

    message("attendanceMessage", "উপস্থিতি সংরক্ষণ হয়েছে।");
    $("attendanceForm").reset();

  } catch (error) {
    message("attendanceMessage", "সমস্যা: " + error.message);
  }
});

/* TEACHER: DAILY READING PROGRESS */

async function saveReadingProgress(studentUid, lessonType, details) {
  const user = auth.currentUser;

  if (!user || !studentUid || !lessonType || !details) {
    throw new Error("সব তথ্য পূরণ করুন।");
  }

  await addDoc(collection(db, "reading_progress"), {
    studentId: studentUid,
    teacherId: user.uid,
    lessonType,
    details,
    createdAt: serverTimestamp()
  });
}

/* PARENT DASHBOARD */

async function loadParentProgress(parentUid) {
  const box = $("parentChildrenProgress");
  box.textContent = "রিপোর্ট লোড হচ্ছে...";

  const profile = await getDoc(
    doc(db, "user_profiles", parentUid)
  );

  box.textContent = "";

  if (!profile.exists()) {
    box.textContent = "অভিভাবকের Profile পাওয়া যায়নি।";
    return;
  }

  const studentIds = profile.data().studentIds || [];

  if (!studentIds.length) {
    box.textContent = "কোনো শিক্ষার্থী যুক্ত করা হয়নি।";
    return;
  }

  for (const studentId of studentIds) {
    const q = query(
      collection(db, "reading_progress"),
      where("studentId", "==", studentId)
    );

    const results = await getDocs(q);

    const card = document.createElement("div");
    card.className = "notice";

    const heading = document.createElement("h3");
    heading.textContent = "শিক্ষার্থীর UID: " + studentId;
    card.append(heading);

    if (results.empty) {
      const p = document.createElement("p");
      p.textContent = "এখনো রিপোর্ট দেওয়া হয়নি।";
      card.append(p);
    } else {
      results.forEach(item => {
        const data = item.data();
        const p = document.createElement("p");

        p.textContent =
          (data.lessonType || "") + ": " +
          (data.details || "");

        card.append(p);
      });
    }

    box.append(card);
  }
}

console.log("Hanafia Future Darul Quran Academy Ready");
