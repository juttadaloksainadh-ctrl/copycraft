import React, { createContext, useContext, useState, useEffect } from 'react';

const LanguageContext = createContext();

const translations = {
  en: {
    welcome: "Welcome back",
    tagline: "Print Smart. Deliver Faster.",
    signIn: "Sign In",
    logout: "Log Out",
    orders: "Total Orders",
    printNew: "Print New Document",
    wallet: "CopyCraft Wallet",
    referral: "Your Referral Code",
    activeStations: "Active Campus Print Stations",
    profile: "My Profile",
    editProfile: "Edit Profile Details",
    saveProfile: "Save Changes",
    language: "Language",
    notifications: "Notifications",
    noNotifications: "No new alerts",
    orderStatus: "Order Status",
    deliveryLoc: "Delivery Location",
    phone: "Contact Phone",
    name: "Full Name",
    email: "Email Address",
    room: "Room Details / Hostel Name",
    saveSuccess: "Profile updated successfully!",
    authWarning: "Warning: Unauthorized access attempt monitored."
  },
  hi: {
    welcome: "वापसी पर स्वागत है",
    tagline: "स्मार्ट प्रिंट करें। तेजी से वितरित करें।",
    signIn: "लॉग इन करें",
    logout: "लॉग आउट",
    orders: "कुल ऑर्डर",
    printNew: "नया दस्तावेज़ प्रिंट करें",
    wallet: "कॉपीक्राफ्ट वॉलेट",
    referral: "आपका रेफ़रल कोड",
    activeStations: "सक्रिय कैंपस प्रिंट स्टेशन",
    profile: "मेरी प्रोफ़ाइल",
    editProfile: "प्रोफ़ाइल विवरण संपादित करें",
    saveProfile: "बदलाव सहेजें",
    language: "भाषा",
    notifications: "सूचनाएं",
    noNotifications: "कोई नई अलर्ट नहीं",
    orderStatus: "ऑर्डर की स्थिति",
    deliveryLoc: "वितरण का स्थान",
    phone: "संपर्क फ़ोन",
    name: "पूरा नाम",
    email: "ईमेल पता",
    room: "कमरे का विवरण / छात्रावास",
    saveSuccess: "प्रोफ़ाइल सफलतापूर्वक अपडेट की गई!",
    authWarning: "चेतावनी: अनधिकृत पहुंच प्रयास की निगरानी की गई।"
  },
  te: {
    welcome: "మళ్లీ స్వాగతం",
    tagline: "స్మార్ట్ ప్రింట్. వేగంగా డెలివరీ.",
    signIn: "లాగిన్ అవ్వండి",
    logout: "లాగ్ అవుట్",
    orders: "మొత్తం ఆర్డర్లు",
    printNew: "కొత్త పత్రాన్ని ప్రింట్ చేయి",
    wallet: "కాపీక్రాఫ్ట్ వాలెట్",
    referral: "మీ రెఫరల్ కోడ్",
    activeStations: "క్యాంపస్ ప్రింట్ స్టేషన్లు",
    profile: "నా ప్రొఫైల్",
    editProfile: "ప్రొఫైల్ వివరాలు సవరించు",
    saveProfile: "మార్పులను సేవ్ చేయి",
    language: "భాష",
    notifications: "నోటిఫికేషన్లు",
    noNotifications: "కొత్త నోటిఫికేషన్లు లేవు",
    orderStatus: "ఆर्डर స్థితి",
    deliveryLoc: "డెలివరీ స్థలం",
    phone: "ఫోన్ నంబర్",
    name: "పూర్తి పేరు",
    email: "ఈమెయిల్ చిరునామా",
    room: "గది వివరాలు / హాస్టల్",
    saveSuccess: "ప్రొఫైల్ విజయవంతంగా అప్‌డేట్ చేయబడింది!",
    authWarning: "హెచ్చరిక: అనధికార లాగిన్ ప్రయత్నం గుర్తించబడింది."
  },
  ta: {
    welcome: "நல்வரவு",
    tagline: "ஸ்மார்ட் பிரிண்ட். அதிவேக விநியோகம்.",
    signIn: "உள்நுழைக",
    logout: "வெளியேறு",
    orders: "மொத்த ஆர்டர்கள்",
    printNew: "புதிய ஆவணத்தை அச்சிடுக",
    wallet: "காபிகிராஃப்ட் வாலட்",
    referral: "பரிந்துரை குறியீடு",
    activeStations: "செயலில் உள்ள அச்சு நிலையங்கள்",
    profile: "எனது சுயவிவரம்",
    editProfile: "சுயவிவர விவரங்களைத் திருத்து",
    saveProfile: "மாற்றங்களைச் சேமி",
    language: "மொழி",
    notifications: "அறிவிப்புகள்",
    noNotifications: "புதிய அறிவிப்புகள் இல்லை",
    orderStatus: "ಆರಡರ್ நிலை",
    deliveryLoc: "விநியோக இடம்",
    phone: "தொலைபேசி எண்",
    name: "முழு பெயர்",
    email: "மின்னஞ்சல் முகவரி",
    room: "அறை விவரங்கள் / விடுதி",
    saveSuccess: "சுயவிவரம் வெற்றிகரமாக புதுப்பிக்கப்பட்டது!",
    authWarning: "எச்சரிக்கை: அங்கீகரிக்கப்படாத அணுகல் முயற்சி கண்டறியப்பட்டது."
  },
  kn: {
    welcome: "ಮರಳಿ ಸ್ವಾಗತ",
    tagline: "ಸ್ಮಾರ್ಟ್ ಪ್ರಿಂಟ್. ವೇಗದ ವಿತರಣೆ.",
    signIn: "ಲಾಗಿನ್ ಮಾಡಿ",
    logout: "ಲಾಗ್ ಔಟ್",
    orders: "ಒಟ್ಟು ಆರ್ಡರ್‌ಗಳು",
    printNew: "ಹೊಸ ದಾಖಲೆ ಪ್ರಿಂಟ್ ಮಾಡಿ",
    wallet: "ಕಾಪಿಕ್ರಾಫ್ಟ್ ವಾಲೆಟ್",
    referral: "ನಿಮ್ಮ ರೆಫರಲ್ ಕೋಡ್",
    activeStations: "ಸಕ್ರಿಯ ಪ್ರಿಂಟ್ ಕೇಂದ್ರಗಳು",
    profile: "ನನ್ನ ಪ್ರೊಫೈಲ್",
    editProfile: "ಪ್ರೊಫೈಲ್ ವಿವರ ತಿದ್ದಿ",
    saveProfile: "ಬದಲಾವಣೆಗಳನ್ನು ಉಳಿಸಿ",
    language: "ಭಾಷೆ",
    notifications: "ಅಧಿಸೂಚನೆಗಳು",
    noNotifications: "ಯಾವುದೇ ಹೊಸ ಅಧಿಸೂಚನೆಗಳಿಲ್ಲ",
    orderStatus: "ಆರ್ಡರ್ ಸ್ಥಿತಿ",
    deliveryLoc: "ವಿತರಣಾ ಸ್ಥಳ",
    phone: "ದೂರವಾಣಿ ಸಂಖ್ಯೆ",
    name: "ಪೂರ್ಣ ಹೆಸರು",
    email: "ಇಮೇಲ್ ವಿಳಾಸ",
    room: "ಕೋಣೆಯ ವಿವರಗಳು / ಹಾಸ್ಟೆಲ್",
    saveSuccess: "ಪ್ರೊಫೈಲ್ ಯಶಸ್ವಿಯಾಗಿ ನವೀಕರಿಸಲಾಗಿದೆ!",
    authWarning: "ಎಚ್ಚರಿಕೆ: ಅನಧಿಕೃತ ಲಾಗಿನ್ ಪ್ರಯತ್ನ ಪತ್ತೆಯಾಗಿದೆ."
  },
  or: {
    welcome: "ସ୍ଵାଗତ",
    tagline: "ସ୍ମାର୍ଟ ପ୍ରିଣ୍ଟ୍ | ଦ୍ରୁତ ବିତରଣ |",
    signIn: "ଲଗ୍-ଇନ୍ କରନ୍ତୁ",
    logout: "ଲଗ୍-ଆଉଟ୍",
    orders: "ମୋଟ ଅର୍ଡର",
    printNew: "ନୂତନ ଦସ୍ତାବେଜ୍ ପ୍ରିଣ୍ଟ୍",
    wallet: "କପି କ୍ରାଫ୍ଟ ୱାଲେଟ୍",
    referral: "ରେଫରାଲ୍ କୋଡ୍",
    activeStations: "ସକ୍ରିୟ ପ୍ରିଣ୍ଟ୍ ଷ୍ଟେସନ",
    profile: "ମୋର ପ୍ରୋଫାଇଲ୍",
    editProfile: "ପ୍ରୋଫାଇଲ୍ ବିବରଣୀ ସଂଶୋଧନ",
    saveProfile: "ପରିବର୍ତ୍ତନ ସଂରକ୍ଷଣ",
    language: "ଭାଷା",
    notifications: "ସୂଚନା",
    noNotifications: "କୌଣସି ନୂଆ ସୂଚନା ନାହିଁ",
    orderStatus: "ଅର୍ଡର ସ୍ଥିତି",
    deliveryLoc: "ବିତରଣ ସ୍ଥାନ",
    phone: "ଫୋନ୍ ନମ୍ବର",
    name: "ପୂରା ନାମ",
    email: "ଇମେଲ୍ ଠିକଣା",
    room: "ରୁମ୍ ବିବରଣୀ / ହଷ୍ଟେଲ୍",
    saveSuccess: "ପ୍ରୋଫାଇଲ୍ ସଫଳତାର ସହ ଅପଡେଟ୍ ହେଲା!",
    authWarning: "ସତର୍କତା: ଅନଧିକୃତ ପ୍ରବେଶ ପ୍ରୟାସ ଚିହ୍ନଟ ହେଲା ।"
  }
};

export const LanguageProvider = ({ children }) => {
  const [lang, setLang] = useState(() => localStorage.getItem('copycraft_lang') || 'en');

  const selectLanguage = (selectedLang) => {
    localStorage.setItem('copycraft_lang', selectedLang);
    setLang(selectedLang);
  };

  const t = (key) => {
    return translations[lang]?.[key] || translations['en']?.[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ lang, selectLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
