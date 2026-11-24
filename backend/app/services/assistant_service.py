import re


class AssistantService:

    def process_command(self, text: str, language: str = "en") -> dict:
        command = text.strip().lower()
        language = language.lower()

        # =================================================
        # 1. Greetings
        # =================================================
        greetings = [
            "hello", "hi", "hey", "namaste",
            "नमस्ते", "हेलो", "नमस्कार"
        ]

        if any(
            re.search(r"\b" + re.escape(word) + r"\b", command)
            for word in greetings if word.isascii()
        ) or any(
            word in command
            for word in greetings if not word.isascii()
        ):
            return self._response(
                "GREETING",
                {},
                "Hello! I'm Sehat Saathi. How can I help you today?",
                "नमस्ते! मैं सेहत साथी हूँ। आज मैं आपकी कैसे मदद कर सकती हूँ?",
                language,
            )

        # =================================================
        # 2. Today's medicines
        # =================================================
        medicine_patterns = [
            r"which medicines.*today",
            r"what medicines.*today",
            r"medicines.*today",
            r"medicine.*today",
            r"what.*medicine.*today",
            r"medication.*today",
            r"what.*medication.*today",
            r"my medicines",
            r"my medication",
            r"my medications",
            r"show.*medicine",
            r"show.*medication",
            r"list.*medicine",
            r"list.*medication",
            r"medicine schedule",
            r"medication schedule",
            r"medicines schedule",
            r"what.*medicine.*take",
            r"what.*medication.*take",
            r"which.*medicine.*take",
            r"which.*medication.*take",
            r"आज.*दवा",
            r"आज.*दवाई",
            r"आज.*औषधि",
            r"दवा.*बताओ",
            r"दवाई.*बताओ",
            r"दवाइयां",
            r"दवाएँ",
            r"मेरी दवा",
            r"मेरी दवाई",
        ]

        if any(
            re.search(pattern, command)
            for pattern in medicine_patterns
        ):
            return self._response(
                "GET_TODAY_MEDICINES",
                {},
                "I'll check your medicines and schedule.",
                "मैं आपकी दवाइयों और उनके समय की जानकारी देखती हूँ।",
                language,
            )

        # =================================================
        # 3. Mark medicine as taken
        # =================================================
        taken_patterns = [
            # English
            r"\bi have taken\b",
            r"\bi've taken\b",
            r"\bi took\b",
            r"\bi already took\b",
            r"\bi already have taken\b",
            r"\btaken my medicine\b",
            r"\btook my medicine\b",
            r"\btaken my medication\b",
            r"\btook my medication\b",
            r"\bmedicine taken\b",
            r"\bmedication taken\b",
            r"\bmark .+ as taken\b",
            r"\bmarked .+ as taken\b",
            r"\b.+ has been taken\b",
            r"\b.+ taken\b",
            r"\bmark.*medicine.*taken\b",
            r"\bmark.*medication.*taken\b",
            r"\bmark.*dose.*taken\b",
            r"\bconfirm.*medicine\b",
            r"\bconfirm.*dose\b",
            r"\bconfirm.*medication\b",

            # Hindi
            r"दवा.*ले ली",
            r"दवाई.*ले ली",
            r"दवा.*लिया",
            r"दवाई.*लिया",
            r"दवा.*खा ली",
            r"दवाई.*खा ली",
            r"दवा.*खाई",
            r"दवाई.*खाई",
            r"मैंने.*दवा.*ली",
            r"मैंने.*दवाई.*ली",
            r"मैंने.*दवा.*लिया",
            r"मैंने.*दवाई.*लिया",
            r"दवा.*हो गई",
            r"दवाई.*हो गई",
        ]

        if any(
            re.search(pattern, command)
            for pattern in taken_patterns
        ):
            return self._response(
                "MARK_MEDICINE_TAKEN",
                {"command_text": text},
                "I'll help you record your medicine intake.",
                "मैं आपकी दवा लेने की जानकारी दर्ज करने में मदद करती हूँ।",
                language,
            )

        # =================================================
        # 4. Create reminder
        # =================================================
        reminder_patterns = [
            r"\bremind me\b",
            r"\bset.*reminder\b",
            r"\bcreate.*reminder\b",
            r"\bschedule.*reminder\b",
            r"\breminder for\b",
            r"\breminder to\b",
            r"\bdon't forget\b",
            r"\bdo not forget\b",
            r"याद दिलाना",
            r"याद दिला",
            r"याद रखना",
            r"याद कराना",
            r"रिमाइंडर",
        ]

        if any(
            re.search(pattern, command)
            for pattern in reminder_patterns
        ):
            return self._response(
                "CREATE_REMINDER",
                {"reminder_text": text},
                "I'll help you create a reminder.",
                "मैं आपका रिमाइंडर बनाने में मदद करती हूँ।",
                language,
            )

        # =================================================
        # 5. Unknown command
        # =================================================
        return self._response(
            "UNKNOWN",
            {},
            "Sorry, I didn't understand that. You can ask about your medicines or create a reminder.",
            "माफ़ कीजिए, मैं समझ नहीं पाई। आप अपनी दवाइयों के बारे में पूछ सकते हैं या रिमाइंडर बना सकते हैं।",
            language,
        )

    # =====================================================
    # Response helper
    # =====================================================
    @staticmethod
    def _response(
        intent: str,
        entities: dict,
        english_response: str,
        hindi_response: str,
        language: str,
    ) -> dict:

        response_text = (
            hindi_response if language == "hi" else english_response
        )

        return {
            "intent": intent,
            "entities": entities,
            "response": response_text,
        }


assistant_service = AssistantService()