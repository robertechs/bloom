// bloom body firmware, for stage 6 (body): an Arduino driving four mecanum
// wheels and a servo arm, taking commands from the Pi 5 over USB serial.
//
// protocol, one command per line at 115200 baud:
//   D <vx> <vy> <w>   drive: forward, left and turn-left (ccw), each -1.0 .. 1.0
//   A <deg>           arm servo angle, 0 .. 180
//   G <deg>           gripper servo angle, 0 .. 180
//   S                 stop the wheels
//   ?                 report state
// the board answers "ok ..." or "err ...". if no drive command arrives for
// WATCHDOG_MS the wheels stop on their own, so a crashed Pi can't run it off the desk.
//
// wiring (two TB6612FNG drivers, one per side):
//   wheel      PWM  IN1  IN2
//   front-L     3    22   23
//   front-R     5    24   25
//   rear-L      6    26   27
//   rear-R      9    28   29
//   arm servo  10,  gripper servo 11,  drivers' STBY on 30
// pins assume an Arduino Mega; change the tables below for another board.

#include <Arduino.h>
#include <Servo.h>

const uint8_t PWM_PIN[4] = {3, 5, 6, 9};
const uint8_t IN1_PIN[4] = {22, 24, 26, 28};
const uint8_t IN2_PIN[4] = {23, 25, 27, 29};
const uint8_t STBY_PIN = 30;
const uint8_t ARM_PIN = 10;
const uint8_t GRIP_PIN = 11;

const unsigned long WATCHDOG_MS = 500;
const int MAX_PWM = 230;      // headroom under 255 so the drivers stay cool
const float DEADBAND = 0.04;  // ignore tiny drift from the Pi side

Servo arm, grip;
float wheel[4] = {0, 0, 0, 0};
int armDeg = 90, gripDeg = 90;
unsigned long lastDrive = 0;
char line[48];
uint8_t len = 0;

float clampf(float v, float lo, float hi) { return v < lo ? lo : (v > hi ? hi : v); }

void setWheel(uint8_t i, float speed) {
  speed = clampf(speed, -1.0f, 1.0f);
  if (fabs(speed) < DEADBAND) speed = 0;
  wheel[i] = speed;
  digitalWrite(IN1_PIN[i], speed > 0 ? HIGH : LOW);
  digitalWrite(IN2_PIN[i], speed < 0 ? HIGH : LOW);
  analogWrite(PWM_PIN[i], (int)(fabs(speed) * MAX_PWM));
}

// mecanum inverse kinematics: body velocity -> four wheel speeds,
// scaled down together if any wheel would go past full speed
void drive(float vx, float vy, float w) {
  float s[4] = {vx - vy - w, vx + vy + w, vx + vy - w, vx - vy + w};
  float peak = 1.0f;
  for (uint8_t i = 0; i < 4; i++) peak = max(peak, (float)fabs(s[i]));
  for (uint8_t i = 0; i < 4; i++) setWheel(i, s[i] / peak);
  lastDrive = millis();
}

void stopWheels() {
  for (uint8_t i = 0; i < 4; i++) setWheel(i, 0);
}

void report() {
  Serial.print(F("ok state wheels"));
  for (uint8_t i = 0; i < 4; i++) { Serial.print(' '); Serial.print(wheel[i], 2); }
  Serial.print(F(" arm ")); Serial.print(armDeg);
  Serial.print(F(" grip ")); Serial.println(gripDeg);
}

void handle(char *cmd) {
  char op = cmd[0];
  char *rest = cmd + 1;
  if (op == 'D') {
    char *a = strtok(rest, " "), *b = strtok(NULL, " "), *c = strtok(NULL, " ");
    if (!a || !b || !c) { Serial.println(F("err D needs vx vy w")); return; }
    drive(atof(a), atof(b), atof(c));
    Serial.println(F("ok drive"));
  } else if (op == 'A' || op == 'G') {
    int deg = constrain(atoi(rest), 0, 180);
    if (op == 'A') { armDeg = deg; arm.write(deg); } else { gripDeg = deg; grip.write(deg); }
    Serial.print(F("ok ")); Serial.print(op == 'A' ? F("arm ") : F("grip ")); Serial.println(deg);
  } else if (op == 'S') {
    stopWheels();
    Serial.println(F("ok stop"));
  } else if (op == '?') {
    report();
  } else {
    Serial.println(F("err unknown command"));
  }
}

void setup() {
  for (uint8_t i = 0; i < 4; i++) {
    pinMode(PWM_PIN[i], OUTPUT);
    pinMode(IN1_PIN[i], OUTPUT);
    pinMode(IN2_PIN[i], OUTPUT);
  }
  pinMode(STBY_PIN, OUTPUT);
  digitalWrite(STBY_PIN, HIGH);
  stopWheels();
  arm.attach(ARM_PIN);
  grip.attach(GRIP_PIN);
  arm.write(armDeg);
  grip.write(gripDeg);
  Serial.begin(115200);
  Serial.println(F("ok bloom body ready"));
}

void loop() {
  while (Serial.available()) {
    char ch = Serial.read();
    if (ch == '\r') continue;
    if (ch == '\n') {
      line[len] = '\0';
      if (len) handle(line);
      len = 0;
    } else if (len < sizeof(line) - 1) {
      line[len++] = ch;
    }
  }
  bool moving = false;
  for (uint8_t i = 0; i < 4; i++) moving |= wheel[i] != 0;
  if (moving && millis() - lastDrive > WATCHDOG_MS) stopWheels();
}
