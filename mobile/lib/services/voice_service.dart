import 'dart:io';
import 'package:path_provider/path_provider.dart';
import 'package:record/record.dart';
import 'package:permission_handler/permission_handler.dart';

enum VoiceErrorType { cancelled, permissionDenied, unknown }

class VoiceResult {
  final File? audio;
  final String? error;
  final VoiceErrorType? errorType;

  const VoiceResult({this.audio, this.error, this.errorType});

  bool get success => audio != null && error == null;
  bool get wasCancelled => errorType == VoiceErrorType.cancelled;
  bool get wasPermissionDenied => errorType == VoiceErrorType.permissionDenied;
}

class VoiceService {
  VoiceService._();
  static final VoiceService instance = VoiceService._();

  final AudioRecorder _recorder = AudioRecorder();
  String? _currentPath;
  bool _isRecording = false;

  bool get isRecording => _isRecording;

  Future<bool> requestPermission() async {
    final status = await Permission.microphone.request();
    return status.isGranted;
  }

  Future<VoiceResult> startRecording() async {
    try {
      final granted = await requestPermission();
      if (!granted) {
        return const VoiceResult(
          error: 'Microphone permission denied',
          errorType: VoiceErrorType.permissionDenied,
        );
      }

      final dir = await getTemporaryDirectory();
      _currentPath =
          '${dir.path}/voice_${DateTime.now().millisecondsSinceEpoch}.m4a';

      await _recorder.start(
        const RecordConfig(
          encoder: AudioEncoder.aacLc,
          bitRate: 128000,
          sampleRate: 44100,
        ),
        path: _currentPath!,
      );

      _isRecording = true;
      return const VoiceResult(); // started OK — no file yet
    } on Exception catch (e) {
      _isRecording = false;
      return VoiceResult(
        error: e.toString(),
        errorType: VoiceErrorType.unknown,
      );
    }
  }

  Future<VoiceResult> stopRecording() async {
    try {
      final path = await _recorder.stop();
      _isRecording = false;

      if (path == null) {
        return const VoiceResult(
          error: 'Recording failed — no file saved',
          errorType: VoiceErrorType.unknown,
        );
      }

      final file = File(path);
      if (!await file.exists() || await file.length() < 1000) {
        return const VoiceResult(
          error: 'Recording too short',
          errorType: VoiceErrorType.unknown,
        );
      }

      return VoiceResult(audio: file);
    } on Exception catch (e) {
      _isRecording = false;
      return VoiceResult(
        error: e.toString(),
        errorType: VoiceErrorType.unknown,
      );
    }
  }

  Future<void> cancelRecording() async {
    try {
      await _recorder.cancel();
    } catch (_) {}
    _isRecording = false;
    if (_currentPath != null) {
      final f = File(_currentPath!);
      if (await f.exists()) await f.delete();
    }
  }

  Future<void> dispose() async {
    await _recorder.dispose();
  }
}