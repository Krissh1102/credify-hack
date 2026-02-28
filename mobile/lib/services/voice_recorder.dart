import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:mobile/services/voice_service.dart';
import 'package:mobile/theme/theme.dart';
import 'dart:io';

/// Shows an animated voice recorder sheet.
/// Returns a [File] (the audio) on success, or null if cancelled.
Future<File?> showVoiceRecorderSheet(BuildContext context) {
  return showModalBottomSheet<File?>(
    context: context,
    backgroundColor: Colors.transparent,
    isScrollControlled: true,
    isDismissible: false, // user must tap Cancel explicitly
    builder: (ctx) => const _VoiceRecorderSheet(),
  );
}

class _VoiceRecorderSheet extends StatefulWidget {
  const _VoiceRecorderSheet();

  @override
  State<_VoiceRecorderSheet> createState() => _VoiceRecorderSheetState();
}

enum _RecordState { idle, recording, stopping }

class _VoiceRecorderSheetState extends State<_VoiceRecorderSheet>
    with SingleTickerProviderStateMixin {
  _RecordState _state = _RecordState.idle;
  int _seconds = 0;
  Timer? _timer;
  String? _error;

  // Pulse animation for the mic button
  late AnimationController _pulseAc;
  late Animation<double> _pulseAnim;

  @override
  void initState() {
    super.initState();
    _pulseAc = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 900),
    );
    _pulseAnim = Tween<double>(begin: 1.0, end: 1.18).animate(
      CurvedAnimation(parent: _pulseAc, curve: Curves.easeInOut),
    );
    // Auto-start recording
    WidgetsBinding.instance.addPostFrameCallback((_) => _startRecording());
  }

  @override
  void dispose() {
    _pulseAc.dispose();
    _timer?.cancel();
    super.dispose();
  }

  Future<void> _startRecording() async {
    setState(() {
      _state = _RecordState.recording;
      _seconds = 0;
      _error = null;
    });

    final result = await VoiceService.instance.startRecording();

    if (!mounted) return;

    if (!result.success && result.error != null) {
      // Check if it was actually a "started OK" result (no file yet = success for start)
      if (result.wasPermissionDenied) {
        setState(() {
          _state = _RecordState.idle;
          _error = 'Microphone permission denied.\nPlease enable it in Settings.';
        });
        return;
      }
    }

    // Start elapsed timer
    _timer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (mounted) setState(() => _seconds++);
      // Auto-stop at 60 seconds
      if (_seconds >= 60) _stopRecording();
    });

    _pulseAc.repeat(reverse: true);
    HapticFeedback.lightImpact();
  }

  Future<void> _stopRecording() async {
    if (_state != _RecordState.recording) return;
    setState(() => _state = _RecordState.stopping);

    _timer?.cancel();
    _pulseAc.stop();
    _pulseAc.reset();
    HapticFeedback.mediumImpact();

    final result = await VoiceService.instance.stopRecording();

    if (!mounted) return;

    if (result.success) {
      Navigator.of(context).pop(result.audio);
    } else {
      setState(() {
        _state = _RecordState.idle;
        _error = result.error ?? 'Recording failed. Try again.';
      });
    }
  }

  Future<void> _cancel() async {
    _timer?.cancel();
    _pulseAc.stop();
    await VoiceService.instance.cancelRecording();
    if (mounted) Navigator.of(context).pop(null);
  }

  String get _timeLabel {
    final m = _seconds ~/ 60;
    final s = _seconds % 60;
    return '${m.toString().padLeft(2, '0')}:${s.toString().padLeft(2, '0')}';
  }

  @override
  Widget build(BuildContext context) {
    R.init(context);
    final cs = Theme.of(context).colorScheme;

    return Container(
      margin: EdgeInsets.fromLTRB(
        16,
        0,
        16,
        MediaQuery.of(context).viewInsets.bottom + 32,
      ),
      decoration: BoxDecoration(
        color: cs.surface,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: cs.outline.withOpacity(0.15)),
      ),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(24, 20, 24, 24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Handle
            Center(
              child: Container(
                width: 36,
                height: 4,
                decoration: BoxDecoration(
                  color: cs.outline.withOpacity(0.4),
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(height: 20),

            // Title
            Text(
              'Voice Transaction',
              style: TextStyle(
                fontWeight: FontWeight.w700,
                fontSize: R.fs(17),
                color: cs.onSurface,
                letterSpacing: -0.4,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              _state == _RecordState.recording
                  ? 'Speak clearly — describe your transaction'
                  : _state == _RecordState.stopping
                  ? 'Processing…'
                  : _error != null
                  ? 'Something went wrong'
                  : 'Tap mic to start',
              style: TextStyle(
                fontSize: R.fs(13),
                color: cs.onSurface.withOpacity(0.5),
              ),
              textAlign: TextAlign.center,
            ),

            const SizedBox(height: 28),

            // Example hints
            if (_state == _RecordState.recording) ...[
              _HintChip('"Spent ₹450 on lunch today"'),
              const SizedBox(height: 6),
              _HintChip('"Paid 1200 electricity bill"'),
              const SizedBox(height: 6),
              _HintChip('"Received 50000 salary"'),
              const SizedBox(height: 24),
            ],

            // Error
            if (_error != null) ...[
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.red.withOpacity(0.08),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.red.withOpacity(0.3)),
                ),
                child: Text(
                  _error!,
                  style: const TextStyle(color: Colors.red, fontSize: 13),
                  textAlign: TextAlign.center,
                ),
              ),
              const SizedBox(height: 20),
            ],

            // Mic button
            AnimatedBuilder(
              animation: _pulseAnim,
              builder: (_, child) => Transform.scale(
                scale: _state == _RecordState.recording ? _pulseAnim.value : 1.0,
                child: child,
              ),
              child: GestureDetector(
                onTap: _state == _RecordState.recording
                    ? _stopRecording
                    : _state == _RecordState.idle
                    ? _startRecording
                    : null,
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 300),
                  width: 88,
                  height: 88,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    gradient: _state == _RecordState.recording
                        ? LinearGradient(
                            colors: [T.accent, Colors.redAccent],
                            begin: Alignment.topLeft,
                            end: Alignment.bottomRight,
                          )
                        : _state == _RecordState.stopping
                        ? LinearGradient(
                            colors: [T.accentSoft, T.accentSoft],
                          )
                        : LinearGradient(
                            colors: [T.accent, T.accentSoft],
                            begin: Alignment.topLeft,
                            end: Alignment.bottomRight,
                          ),
                    boxShadow: [
                      BoxShadow(
                        color: T.accent.withOpacity(
                          _state == _RecordState.recording ? 0.5 : 0.25,
                        ),
                        blurRadius: _state == _RecordState.recording ? 28 : 16,
                        offset: const Offset(0, 6),
                      ),
                    ],
                  ),
                  child: _state == _RecordState.stopping
                      ? const Center(
                          child: SizedBox(
                            width: 24,
                            height: 24,
                            child: CircularProgressIndicator(
                              color: Colors.white,
                              strokeWidth: 2.5,
                            ),
                          ),
                        )
                      : Icon(
                          _state == _RecordState.recording
                              ? Icons.stop_rounded
                              : Icons.mic_rounded,
                          color: Colors.white,
                          size: 36,
                        ),
                ),
              ),
            ),

            const SizedBox(height: 16),

            // Timer
            AnimatedSwitcher(
              duration: const Duration(milliseconds: 200),
              child: _state == _RecordState.recording
                  ? Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      key: const ValueKey('timer'),
                      children: [
                        Container(
                          width: 8,
                          height: 8,
                          decoration: const BoxDecoration(
                            color: Colors.red,
                            shape: BoxShape.circle,
                          ),
                        ),
                        const SizedBox(width: 6),
                        Text(
                          _timeLabel,
                          style: TextStyle(
                            color: T.textPrimary,
                            fontSize: R.fs(20),
                            fontWeight: FontWeight.w700,
                            letterSpacing: 2,
                          ),
                        ),
                        const SizedBox(width: 8),
                        Text(
                          '/ 01:00',
                          style: TextStyle(
                            color: T.textMuted,
                            fontSize: R.fs(13),
                          ),
                        ),
                      ],
                    )
                  : Text(
                      _state == _RecordState.stopping
                          ? 'Saving recording…'
                          : _error != null
                          ? 'Tap mic to retry'
                          : 'Tap mic to start recording',
                      key: const ValueKey('idle'),
                      style: TextStyle(
                        color: T.textSecondary,
                        fontSize: R.fs(13),
                      ),
                    ),
            ),

            const SizedBox(height: 24),

            // Action hint + Cancel
            if (_state == _RecordState.recording)
              Text(
                'Tap the button to stop and analyze',
                style: TextStyle(
                  color: T.textMuted,
                  fontSize: R.fs(12),
                ),
              ),

            const SizedBox(height: 12),

            TextButton(
              onPressed: _cancel,
              style: TextButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 32),
                minimumSize: const Size(double.infinity, 0),
              ),
              child: Text(
                'Cancel',
                style: TextStyle(
                  color: cs.error,
                  fontWeight: FontWeight.w600,
                  fontSize: R.fs(15),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _HintChip extends StatelessWidget {
  final String text;
  const _HintChip(this.text);

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
      decoration: BoxDecoration(
        color: T.elevated,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: T.border),
      ),
      child: Text(
        text,
        style: TextStyle(
          color: T.textSecondary,
          fontSize: R.fs(12),
          fontStyle: FontStyle.italic,
        ),
      ),
    );
  }
}