import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;

/// Result from Gemini receipt analysis
class ReceiptData {
  final double? amount;
  final String? category;
  final String? description;
  final String? date; // ISO format: yyyy-MM-dd
  final String? type; // INCOME or EXPENSE
  final String? rawText;
  final String? error;

  const ReceiptData({
    this.amount,
    this.category,
    this.description,
    this.date,
    this.type,
    this.rawText,
    this.error,
  });

  bool get success => error == null && amount != null;
}

class GeminiService {
  GeminiService._();
  static final GeminiService instance = GeminiService._();

  // 🔑 Replace with your actual Gemini API key
  // Get one free at: https://aistudio.google.com/app/apikey
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

  Future<ReceiptData> analyzeReceipt(File imageFile) async {
    try {
      // Read image and encode to base64
      final bytes = await imageFile.readAsBytes();
      final base64Image = base64Encode(bytes);

      // Detect MIME type from extension
      final ext = imageFile.path.split('.').last.toLowerCase();
      final mimeType = ext == 'png'
          ? 'image/png'
          : ext == 'webp'
          ? 'image/webp'
          : 'image/jpeg';

      final prompt = '''
You are a receipt/bill scanner AI. Analyze this receipt image and extract the following information.

IMPORTANT: Respond ONLY with a valid JSON object. No markdown, no backticks, no explanation.

Extract these fields:
- amount: total amount as a number (e.g., 450.00). Look for "Total", "Grand Total", "Amount Due", "Net Amount" etc.
- category: one of exactly these options: ${_validCategories.join(', ')}
- description: brief 1-line description of what was purchased (e.g., "Lunch at Cafe Coffee Day", "Uber ride to airport")
- date: date of transaction in yyyy-MM-dd format. If not visible, return today's date.
- type: "EXPENSE" for most purchases/bills. "INCOME" only if this is a payment receipt TO the person.

Return this exact JSON structure:
{
  "amount": 450.00,
  "category": "Food & Dining",
  "description": "Lunch at restaurant",
  "date": "2024-01-15",
  "type": "EXPENSE"
}

If you cannot read the receipt clearly, still return your best guess with the fields you can read.
If the image is not a receipt at all, return: {"error": "Not a receipt"}
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
                        'data': base64Image,
                      },
                    },
                  ],
                },
              ],
              'generationConfig': {
                'temperature': 0.1,
                'maxOutputTokens': 512,
              },
            }),
          )
          .timeout(const Duration(seconds: 30));

      if (response.statusCode != 200) {
        final body = jsonDecode(response.body);
        final msg = body['error']?['message'] ?? 'API error ${response.statusCode}';
        return ReceiptData(error: msg);
      }

      final body = jsonDecode(response.body);
      final text =
          body['candidates']?[0]?['content']?['parts']?[0]?['text'] as String?;

      if (text == null || text.isEmpty) {
        return const ReceiptData(error: 'No response from Gemini');
      }

      // Parse JSON from response
      return _parseGeminiResponse(text);
    } on SocketException {
      return const ReceiptData(error: 'No internet connection');
    } on http.ClientException catch (e) {
      return ReceiptData(error: 'Network error: ${e.message}');
    } catch (e) {
      return ReceiptData(error: 'Unexpected error: $e');
    }
  }

  ReceiptData _parseGeminiResponse(String rawText) {
    try {
      // Strip any markdown fences just in case
      String cleaned = rawText.trim();
      if (cleaned.startsWith('```')) {
        cleaned = cleaned
            .replaceAll(RegExp(r'^```[a-z]*\n?'), '')
            .replaceAll(RegExp(r'\n?```$'), '')
            .trim();
      }

      final json = jsonDecode(cleaned) as Map<String, dynamic>;

      if (json.containsKey('error')) {
        return ReceiptData(error: json['error'] as String?);
      }

      // Validate category
      String? category = json['category'] as String?;
      if (category != null && !_validCategories.contains(category)) {
        category = _guessCategory(category);
      }

      // Parse amount safely
      double? amount;
      final rawAmount = json['amount'];
      if (rawAmount is num) {
        amount = rawAmount.toDouble();
      } else if (rawAmount is String) {
        amount = double.tryParse(rawAmount.replaceAll(RegExp(r'[^0-9.]'), ''));
      }

      return ReceiptData(
        amount: amount,
        category: category ?? 'Others',
        description: json['description'] as String?,
        date: json['date'] as String?,
        type: (json['type'] as String?)?.toUpperCase() ?? 'EXPENSE',
        rawText: rawText,
      );
    } catch (e) {
      return ReceiptData(error: 'Failed to parse Gemini response: $e');
    }
  }

  /// Fuzzy-match Gemini's category guess to our supported list
  String _guessCategory(String raw) {
    final lower = raw.toLowerCase();
    if (lower.contains('food') || lower.contains('restaurant') || lower.contains('dining') || lower.contains('cafe') || lower.contains('eat'))
      return 'Food & Dining';
    if (lower.contains('transport') || lower.contains('travel') || lower.contains('cab') || lower.contains('uber') || lower.contains('fuel') || lower.contains('petrol'))
      return 'Transport';
    if (lower.contains('shop') || lower.contains('retail') || lower.contains('cloth') || lower.contains('amazon') || lower.contains('flipkart'))
      return 'Shopping';
    if (lower.contains('bill') || lower.contains('util') || lower.contains('electric') || lower.contains('water') || lower.contains('internet') || lower.contains('phone'))
      return 'Bills & Utilities';
    if (lower.contains('health') || lower.contains('medical') || lower.contains('doctor') || lower.contains('pharma') || lower.contains('hospital'))
      return 'Healthcare';
    if (lower.contains('entertain') || lower.contains('movie') || lower.contains('netflix') || lower.contains('game'))
      return 'Entertainment';
    if (lower.contains('salary') || lower.contains('wage') || lower.contains('payroll'))
      return 'Salary';
    if (lower.contains('invest') || lower.contains('stock') || lower.contains('mutual fund'))
      return 'Investment';
    return 'Others';
  }
}