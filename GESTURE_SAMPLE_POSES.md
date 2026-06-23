# Gesture Sample Poses

The Gesture Recognition page currently uses the following rule-based demo mappings:

| Hand pose | Sample prediction |
| --- | --- |
| Raise only the pinky | I want to eat food |
| Raise only the index finger | I want to go to toilet |
| Show two open hands | I want to drink water |
| Raise the index finger and pinky | Yes |
| Raise the index, middle, ring, and pinky fingers while keeping the thumb tucked | Help |
| Raise all five fingers with an open hand | Sit down |
| Close all fingers into a fist | No |

## How the sample prediction works

- The camera can see one or two hands, depending on the supported pose.
- “I want to drink water” requires two open hands; the other sample predictions use one hand.
- MediaPipe detects the hand landmarks and finger positions.
- MakaLearn compares the extended fingers with the mappings above.
- The pose must remain stable for several video frames before the prediction appears.

## Important limitation

These poses are temporary sample mappings for demonstrating the prediction flow. They are not official Makaton gestures and should not be used as approved teaching content. The rule-based predictor will later be replaced with a trained and approved gesture-recognition model and verified reference data.

The implementation source of truth is `src/utils/gesture-prediction.ts`.
