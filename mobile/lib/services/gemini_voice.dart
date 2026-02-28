import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;

/// Result from Gemini voice analysis
class VoiceTransactionData {
  final double? amount;
  final String? category;
  final String? description;
  final String? date; // ISO format: yyyy-MM-dd
  final String? type; // INCOME or EXPENSE
  final String? transcription;
  final String? error;

  const VoiceTransactionData({
    this.amount,
    this.category,
    this.description,
    this.date,
    this.type,
    this.transcription,
    this.error,
  });

  bool get success => error == null && amount != null;
}

class GeminiVoiceService {
  GeminiVoiceService._();
  static final GeminiVoiceService instance = GeminiVoiceService._();

  // 🔑 Same API key as GeminiService
  static const String _apiKey = 'AIzaSyDAYaaPaPatH60G5rM_62qzmTZULRPEKbo';

  static const String _model = 'gemini-2.5-flash';
  static const String _baseUrl =
      'https://generativelanguage.googleapis.com/v1beta/models/$_model:generateContent';

  static const List<String> _validCategories = [
    'Food & Dining',
    'Transport',
    'Shopping',
    'Bills & Utilities',
    'Healthcare',
    'Entertainment',
    'Salary',
    'Investment',
    'Others',
  ];

  Future<VoiceTransactionData> analyzeVoice(File audioFile) async {
    try {
      final bytes = await audioFile.readAsBytes();
      final base64Audio = base64Encode(bytes);

      // Detect mime type
      final ext = audioFile.path.split('.').last.toLowerCase();
      final mimeType = ext == 'mp3'
          ? 'audio/mp3'
          : ext == 'wav'
          ? 'audio/wav'
          : ext == 'ogg'
          ? 'audio/ogg'
          : 'audio/mp4'; // m4a / aac

      final prompt =
          '''
You are a voice-to-transaction AI assistant for a personal finance app used in India.

The user has spoken a short voice note describing a financial transaction.

TASK:
1. Transcribe what they said (in the "transcription" field)
2. Extract transaction details from the speech

IMPORTANT: Respond ONLY with a valid JSON object. No markdown, no backticks, no extra text.

The user may say things like:
- "I spent 450 rupees on lunch today at a restaurant"
- "Paid 1200 for electricity bill"
- "Received 50000 salary"
- "Bought groceries for 800 bucks"
- "Took an Uber, paid 230"
- They may speak in English, Hindi, or Hinglish (Hindi+English mix)

Extract these fields:
- transcription: what the user said (in English)
- amount: numeric total amount (e.g. 450.00). Extract numbers from speech like "four fifty", "साढ़े तीन सौ" etc.
- category: one of exactly: ${_validCategories.join(', ')}
- description: brief 1-line description (e.g. "Lunch at restaurant", "Electricity bill payment")
- date: date in yyyy-MM-dd format. Use today if not mentioned: ${DateTime.now().toIso8601String().split('T')[0]}
- type: "EXPENSE" for spending/payments, "INCOME" for salary/received money

Return this exact JSON:
{
  "transcription": "I spent 450 rupees on lunch at a restaurant",
  "amount": 450.00,
  "category": "Food & Dining",
  "description": "Lunch at restaurant",
  "date": "${DateTime.now().toIso8601String().split('T')[0]}",
  "type": "EXPENSE"
}

If the audio is silent, unclear, or not about a transaction, return:
{"error": "Could not understand. Please try again."}
''';

      final response = await http
          .post(
            Uri.parse('$_baseUrl?key=$_apiKey'),
            headers: {'Content-Type': 'application/json'},
            body: jsonEncode({
              'contents': [
                {
                  'parts': [
                    {'text': prompt},
                    {
                      'inline_data': {
                        'mime_type': mimeType,
                        'data': base64Audio,
                      },
                    },
                  ],
                },
              ],
              'generationConfig': {'temperature': 0.1, 'maxOutputTokens': 512},
            }),
          )
          .timeout(const Duration(seconds: 30));

      if (response.statusCode != 200) {
        final body = jsonDecode(response.body);
        final msg =
            body['error']?['message'] ?? 'API error ${response.statusCode}';
        return VoiceTransactionData(error: msg);
      }

      final body = jsonDecode(response.body);
      final text =
          body['candidates']?[0]?['content']?['parts']?[0]?['text'] as String?;

      if (text == null || text.isEmpty) {
        return const VoiceTransactionData(error: 'No response from Gemini');
      }

      return _parseResponse(text);
    } on SocketException {
      return const VoiceTransactionData(error: 'No internet connection');
    } on http.ClientException catch (e) {
      return VoiceTransactionData(error: 'Network error: ${e.message}');
    } catch (e) {
      return VoiceTransactionData(error: 'Unexpected error: $e');
    }
  }

  VoiceTransactionData _parseResponse(String rawText) {
    try {
      String cleaned = rawText.trim();
      if (cleaned.startsWith('```')) {
        cleaned = cleaned
            .replaceAll(RegExp(r'^```[a-z]*\n?'), '')
            .replaceAll(RegExp(r'\n?```$'), '')
            .trim();
      }

      final json = jsonDecode(cleaned) as Map<String, dynamic>;

      if (json.containsKey('error')) {
        return VoiceTransactionData(error: json['error'] as String?);
      }

      String? category = json['category'] as String?;
      if (category != null && !_validCategories.contains(category)) {
        category = _guessCategory(category);
      }

      double? amount;
      final rawAmount = json['amount'];
      if (rawAmount is num) {
        amount = rawAmount.toDouble();
      } else if (rawAmount is String) {
        amount = double.tryParse(rawAmount.replaceAll(RegExp(r'[^0-9.]'), ''));
      }

      return VoiceTransactionData(
        transcription: json['transcription'] as String?,
        amount: amount,
        category: category ?? 'Others',
        description: json['description'] as String?,
        date: json['date'] as String?,
        type: (json['type'] as String?)?.toUpperCase() ?? 'EXPENSE',
      );
    } catch (e) {
      return VoiceTransactionData(error: 'Failed to parse response: $e');
    }
  }

  String _guessCategory(String raw) {
    final lower = raw.toLowerCase();
    if (lower.contains('food') ||
        lower.contains('restaurant') ||
        lower.contains('dining') ||
        lower.contains('cafe') ||
        lower.contains('eat') ||
        lower.contains('lunch') ||
        lower.contains('dinner'))
      return 'Food & Dining';
    if (lower.contains('transport') ||
        lower.contains('travel') ||
        lower.contains('cab') ||
        lower.contains('uber') ||
        lower.contains('fuel') ||
        lower.contains('petrol') ||
        lower.contains('auto'))
      return 'Transport';
    if (lower.contains('shop') ||
        lower.contains('retail') ||
        lower.contains('cloth') ||
        lower.contains('amazon') ||
        lower.contains('flipkart') ||
        lower.contains('grocer'))
      return 'Shopping';
    if (lower.contains('bill') ||
        lower.contains('util') ||
        lower.contains('electric') ||
        lower.contains('water') ||
        lower.contains('internet') ||
        lower.contains('phone') ||
        lower.contains('recharge'))
      return 'Bills & Utilities';
    if (lower.contains('health') ||
        lower.contains('medical') ||
        lower.contains('doctor') ||
        lower.contains('pharma') ||
        lower.contains('hospital') ||
        lower.contains('medicine'))
      return 'Healthcare';
    if (lower.contains('entertain') ||
        lower.contains('movie') ||
        lower.contains('netflix') ||
        lower.contains('game') ||
        lower.contains('ott'))
      return 'Entertainment';
    if (lower.contains('salary') ||
        lower.contains('wage') ||
        lower.contains('payroll') ||
        lower.contains('income'))
      return 'Salary';
    if (lower.contains('invest') ||
        lower.contains('stock') ||
        lower.contains('mutual fund') ||
        lower.contains('sip'))
      return 'Investment';
    return 'Others';
  }
}
