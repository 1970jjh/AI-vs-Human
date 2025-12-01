/**
 * ChatGPT (OpenAI) API 기반 스트림스 AI 챌린지 웹앱 - 72점 요새 전략 버전 (조커 최적화)
 * 최우선 지침: 3번째~18번째 칸 연속 오름차순 불가능 시 무조건 수동 배치 (강화 버전)
 * 업데이트: 조커 그대로 배치, 조커 최적 배치를 고려한 정확한 점수계산, 같은 숫자 인근 배치
 */

// 전역 변수로 API 키를 안전하게 보관할 공간을 마련합니다.
const SCRIPT_PROPS = PropertiesService.getScriptProperties();

// 웹 앱 접속 시 Index.html 파일을 보여주는 함수입니다.
function doGet(e) {
  try {
    return HtmlService.createHtmlOutputFromFile('Index')
      .setTitle("AI 1% Challenge - 72점 요새 전략")
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  } catch (error) {
    return HtmlService.createHtmlOutput(`<h1>오류</h1><p>'Index.html' 파일을 찾을 수 없습니다.</p>`);
  }
}

// (최초 1회 실행) OpenAI API 키를 안전하게 저장하는 설정 함수입니다.
function setup() {
  const apiKey = "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"; 
  if (!apiKey || apiKey === "YOUR_OPENAI_API_KEY_HERE") { 
    Logger.log("API 키를 입력해주세요. setup() 함수에서 YOUR_OPENAI_API_KEY_HERE를 실제 키로 교체하세요.");
    return; 
  }
  SCRIPT_PROPS.setProperty('OPENAI_API_KEY', apiKey);
  Logger.log("성공! OpenAI API 키가 저장되었습니다.");
}

// 프론트엔드에서 호출하여 OpenAI API와 통신하는 메인 함수
function getAIBestMove(board, number, remainingNumbers) {
  Logger.log("=== AI 배치 시작 ===");
  Logger.log(`현재 보드: ${JSON.stringify(board)}`);
  Logger.log(`배치할 숫자: ${number}`);
  
  // *** 같은 숫자 두 번째 등장 처리 ***
  if (number !== '★' && number !== 1 && number !== 30) {
    const existingIndex = board.indexOf(number);
    if (existingIndex !== -1) {
      Logger.log(`같은 숫자 ${number} 발견됨 (위치: ${existingIndex}). 인근 배치 시도...`);
      const adjacentPosition = findAdjacentPosition(board, existingIndex, number);
      if (adjacentPosition !== -1) {
        Logger.log(`✅ 인근 위치 ${adjacentPosition}에 배치`);
        return {
          "index": adjacentPosition,
          "number": number,
          "reason": `같은 숫자 ${number}의 인근 위치에 배치`
        };
      }
    }
  }
  
  // *** 최우선 지침 검사: 3번째~18번째 칸 연속 오름차순 가능 여부 ***
  // 예외: 앵커 숫자(1, 30)와 조커는 특별 처리
  if (number === 1) {
    Logger.log("앵커 숫자 1: 3번째 칸에 배치");
  } else if (number === 30) {
    Logger.log("앵커 숫자 30: 18번째 칸에 배치");
  } else if (number === '★') {
    Logger.log("조커: AI 처리 (그대로 배치)");
  } else {
    // 일반 숫자: 메인 존에서 연속 오름차순 가능 여부 검사
    Logger.log(`일반 숫자 ${number}: 메인 존 호환성 검사 시작`);
    const canPlaceInMainZone = checkMainZoneStrictAscending(board, number);
    Logger.log(`메인 존 배치 가능 여부: ${canPlaceInMainZone}`);
    
    if (!canPlaceInMainZone) {
      Logger.log(`❌ 숫자 ${number}는 메인 존에서 연속 오름차순 불가능 → 수동 모드 전환`);
      return {
        "index": -1, 
        "number": "MANUAL_MODE", 
        "reason": `숫자 ${number}는 3~18번째 칸에서 연속 오름차순을 만들 수 없습니다.`
      };
    } else {
      Logger.log(`✅ 숫자 ${number}는 메인 존 배치 가능 → AI 처리`);
    }
  }

  // API 호출 부분
  const API_KEY = SCRIPT_PROPS.getProperty('OPENAI_API_KEY');
  if (!API_KEY) {
    throw new Error("OpenAI API 키가 설정되지 않았습니다. Code.gs의 setup() 함수를 실행하여 키를 먼저 저장해주세요.");
  }

  const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";
  
  const systemPrompt = buildSystemPrompt();
  const userPrompt = buildUserPrompt(board, number, remainingNumbers);

  const payload = {
    model: "gpt-4o",
    messages: [ 
      { role: "system", content: systemPrompt }, 
      { role: "user", content: userPrompt } 
    ],
    response_format: { "type": "json_object" },
    temperature: 0.1,
    max_tokens: 300
  };

  const options = {
    method: 'post',
    contentType: 'application/json',
    headers: { 'Authorization': 'Bearer ' + API_KEY },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  const MAX_RETRIES = 3;
  let backoffMs = 1000;

  for (let i = 0; i < MAX_RETRIES; i++) {
    try {
      const response = UrlFetchApp.fetch(OPENAI_API_URL, options);
      const responseCode = response.getResponseCode();
      const responseText = response.getContentText();

      if (responseCode === 200) {
        const responseData = JSON.parse(responseText);
        if (responseData.choices && responseData.choices.length > 0) {
          const bestMoveData = JSON.parse(responseData.choices[0].message.content);
          
          Logger.log(`AI 응답: ${JSON.stringify(bestMoveData)}`);
          
          // *** 2차 검증: AI 응답도 다시 한번 검사 ***
          if (bestMoveData.index >= 2 && bestMoveData.index <= 17 && number !== '★') {
            // 메인 존 배치인 경우 오름차순 재검증 (조커는 제외)
            if (!validateAscendingPlacement(board, bestMoveData.index, bestMoveData.number)) {
              Logger.log(`❌ AI가 제안한 배치가 오름차순 위반 → 수동 모드 강제 전환`);
              return {
                "index": -1, 
                "number": "MANUAL_MODE", 
                "reason": `AI가 제안한 위치에서 오름차순이 위반됩니다.`
              };
            }
          }
          
          // 응답 검증
          if (bestMoveData.index === -1 && bestMoveData.number === "MANUAL_MODE") {
            return bestMoveData;
          } else if (typeof bestMoveData.index !== 'number' || 
              bestMoveData.index < 0 || bestMoveData.index >= 20 ||
              typeof bestMoveData.number === 'undefined') {
            throw new Error("AI가 잘못된 형식의 응답을 반환했습니다.");
          }
          
          Logger.log(`✅ AI 배치 확정: 위치 ${bestMoveData.index}, 숫자 ${bestMoveData.number}`);
          return bestMoveData;
        } else { 
          throw new Error("API로부터 유효한 응답을 받지 못했습니다."); 
        }
      } else if (responseCode === 429) {
        Logger.log(`API 속도 제한. ${backoffMs}ms 대기 후 재시도...`);
        Utilities.sleep(backoffMs);
        backoffMs *= 2;
      } else {
        Logger.log("API 오류 응답: " + responseText);
        throw new Error(`API 서버 오류 (코드: ${responseCode})`);
      }
    } catch (error) {
      Logger.log(`시도 ${i+1} 실패: ${error.toString()}`);
      if (i === MAX_RETRIES - 1) {
        throw error;
      }
      Utilities.sleep(backoffMs);
      backoffMs *= 1.5;
    }
  }
  throw new Error(`최대 재시도 횟수(${MAX_RETRIES}회)를 초과했습니다.`);
}

// *** 같은 숫자의 인근 위치 찾기 함수 ***
function findAdjacentPosition(board, existingIndex, number) {
  Logger.log(`=== 같은 숫자 ${number} 인근 배치 검사 (기준 위치: ${existingIndex}) ===`);
  
  // 바로 앞 위치 확인
  if (existingIndex > 0 && board[existingIndex - 1] === null) {
    // 오름차순 검증
    if (validateAscendingPlacement(board, existingIndex - 1, number)) {
      Logger.log(`✅ 바로 앞 위치 ${existingIndex - 1} 배치 가능`);
      return existingIndex - 1;
    }
  }
  
  // 바로 뒤 위치 확인
  if (existingIndex < 19 && board[existingIndex + 1] === null) {
    // 오름차순 검증
    if (validateAscendingPlacement(board, existingIndex + 1, number)) {
      Logger.log(`✅ 바로 뒤 위치 ${existingIndex + 1} 배치 가능`);
      return existingIndex + 1;
    }
  }
  
  Logger.log(`❌ 인근에 적절한 위치 없음`);
  return -1;
}

// *** 엄격한 메인 존 연속 오름차순 검사 함수 (조커 고려) ***
function checkMainZoneStrictAscending(board, number) {
  Logger.log(`=== 메인 존 엄격 검사 시작: 숫자 ${number} ===`);
  
  let hasValidPosition = false;
  
  // 메인 존(인덱스 2~17, 3번째~18번째 칸) 모든 빈칸 검사
  for (let i = 2; i <= 17; i++) {
    if (board[i] === null) { // 빈칸인 경우에만 검사
      Logger.log(`위치 ${i}(${i+1}번째 칸) 검사...`);
      
      // 왼쪽 인접 숫자 확인 (엄격한 오름차순)
      let leftValid = true;
      if (i > 0 && board[i - 1] !== null) {
        if (board[i - 1] !== '★' && board[i - 1] >= number) { // 조커가 아니고 같거나 큰 경우 위반
          leftValid = false;
          Logger.log(`  ❌ 왼쪽 위반: ${board[i - 1]} >= ${number}`);
        } else {
          Logger.log(`  ✅ 왼쪽 OK: ${board[i - 1]} < ${number} 또는 조커`);
        }
      } else {
        Logger.log(`  ✅ 왼쪽 빈칸 또는 경계`);
      }
      
      // 오른쪽 인접 숫자 확인 (엄격한 오름차순)
      let rightValid = true;
      if (i < 19 && board[i + 1] !== null) {
        if (board[i + 1] !== '★' && board[i + 1] <= number) { // 조커가 아니고 같거나 작은 경우 위반
          rightValid = false;
          Logger.log(`  ❌ 오른쪽 위반: ${board[i + 1]} <= ${number}`);
        } else {
          Logger.log(`  ✅ 오른쪽 OK: ${board[i + 1]} > ${number} 또는 조커`);
        }
      } else {
        Logger.log(`  ✅ 오른쪽 빈칸 또는 경계`);
      }
      
      if (leftValid && rightValid) {
        Logger.log(`  ✅ 위치 ${i} 배치 가능!`);
        hasValidPosition = true;
      } else {
        Logger.log(`  ❌ 위치 ${i} 배치 불가능`);
      }
    }
  }
  
  Logger.log(`=== 메인 존 검사 결과: ${hasValidPosition ? '배치 가능' : '배치 불가능'} ===`);
  return hasValidPosition;
}

// *** AI 응답 재검증 함수 ***
function validateAscendingPlacement(board, index, number) {
  Logger.log(`=== AI 응답 재검증: 위치 ${index}, 숫자 ${number} ===`);
  
  // 이미 차있는 위치인지 확인
  if (board[index] !== null) {
    Logger.log(`❌ 위치 ${index}는 이미 차있음: ${board[index]}`);
    return false;
  }
  
  // 조커는 검증 통과
  if (number === '★') {
    Logger.log(`✅ 조커는 검증 통과`);
    return true;
  }
  
  // 왼쪽 인접 숫자 확인
  if (index > 0 && board[index - 1] !== null && board[index - 1] !== '★') {
    if (board[index - 1] >= number) {
      Logger.log(`❌ 왼쪽 오름차순 위반: ${board[index - 1]} >= ${number}`);
      return false;
    }
  }
  
  // 오른쪽 인접 숫자 확인
  if (index < 19 && board[index + 1] !== null && board[index + 1] !== '★') {
    if (board[index + 1] <= number) {
      Logger.log(`❌ 오른쪽 오름차순 위반: ${board[index + 1]} <= ${number}`);
      return false;
    }
  }
  
  Logger.log(`✅ 배치 검증 통과`);
  return true;
}

// 72점 요새 전략을 반영한 시스템 프롬프트 (업데이트)
function buildSystemPrompt() {
    return `당신은 보드게임 '스트림스'의 AI 전문가 '포트리스-72(Fortress-72)'입니다. 당신의 유일한 목표는 정확히 72점을 획득하는 것입니다.

## *** 최우선 지침 ***
3번째칸과 18번째 칸을 연속해서 오름차순으로 이어갈 수 없는 숫자는 이미 사전에 필터링되어 수동 배치로 전환됩니다. 따라서 당신에게 전달되는 모든 숫자는 메인 존에서 연속 오름차순이 가능한 숫자입니다.

## *** 절대 금지 사항 ***
- 어떤 경우에도 인접한 숫자보다 작은 숫자를 그 뒤에 배치하면 안 됩니다
- 예: 8이 있는 위치 다음에 7을 배치하는 것은 절대 금지
- 모든 배치는 엄격한 오름차순(≤)을 유지해야 합니다

## *** 조커(★) 업데이트 처리 ***
- 조커는 숫자로 변환하지 않고 '★' 그대로 배치합니다
- 조커는 어떤 숫자와도 오름차순을 만족시킬 수 있습니다
- 조커를 활용해 끊어진 연결을 이어주는 위치에 배치하세요

## *** 같은 숫자 처리 ***
- 같은 숫자가 두 번째로 나오는 경우는 이미 사전 처리됩니다
- 기존 같은 숫자의 바로 앞 또는 바로 뒤에 배치됩니다

## 72점 요새 전략
목표: 정확히 72점 = 70점(메인 스트림) + 1점(헤드 버퍼) + 1점(테일 버퍼)

### 구역 정의
- 메인 존 (Main Zone): 인덱스 2~17 (3번째~18번째 칸, 총 16칸)
- 헤드 버퍼 (Head Buffer): 인덱스 0~1 (1번째~2번째 칸, 총 2칸)  
- 테일 버퍼 (Tail Buffer): 인덱스 18~19 (19번째~20번째 칸, 총 2칸)

### 핵심 배치 원칙

#### 1. 앵커 배치 (절대 우선순위)
- 숫자 1: 반드시 인덱스 2(3번째 칸)에 배치
- 숫자 30: 반드시 인덱스 17(18번째 칸)에 배치

#### 2. 메인 존 확률적 배치 (1과 30 사이 숫자들)
배치 공식:
1. 남은 숫자 목록에서 현재 숫자보다 작은 숫자 개수 = less_count
2. 남은 숫자 목록에서 현재 숫자보다 큰 숫자 개수 = more_count  
3. 비율 계산: ratio = less_count / (less_count + more_count)
4. 목표 인덱스: target_index = 2 + floor(15 * ratio)
5. target_index에 가장 가까운 메인 존 내에서 **오름차순을 유지할 수 있는** 빈칸에 배치

#### 3. 조커(★) 전략 (업데이트)
조커는 연결성을 최대화하는 위치에 '★' 그대로 배치:
1. 메인 존 내 가장 큰 간격을 메우는 위치에 배치
2. 연속성이 끊어진 부분을 연결하는 위치에 배치  
3. 없다면 가장 높은 점수 향상을 가져올 위치에 배치

### 의사결정 알고리즘
1. 만약 숫자가 1이면 인덱스 2에 배치
2. 만약 숫자가 30이면 인덱스 17에 배치  
3. 만약 조커라면 최적 연결 위치에 '★' 그대로 배치
4. 그 외의 경우: 
   - 확률적 계산으로 메인 존 목표 위치 계산
   - 목표 위치 근처에서 오름차순을 유지할 수 있는 첫 번째 빈칸에 배치
   - **절대로 오름차순을 위반하는 위치에 배치하지 않음**

## 출력 형식
반드시 다음 JSON 형식으로만 응답:
{"index": [0-19 사이의 숫자], "number": [배치될 숫자]}

조커의 경우 number 필드에 '★'를 그대로 입력하세요.`;
}

function buildUserPrompt(board, number, remainingNumbers) {
  const boardState = board.map(cell => cell === null ? null : cell);
  const remainingTurns = board.filter(x => x === null).length;
  const analysis = analyze72Strategy(board, number, remainingNumbers);
  
  const prompt = {
    current_board: boardState,
    number_to_place: number,
    remaining_turns: remainingTurns,
    remaining_numbers_pool: remainingNumbers,
    strategy_analysis: analysis
  };
  
  return JSON.stringify(prompt);
}

// 72점 요새 전략 분석 함수
function analyze72Strategy(board, currentNumber, remainingNumbers) {
  const analysis = {
    main_zone_status: {},
    buffer_status: {},
    probability_calculation: {},
    optimal_strategy: ""
  };
  
  // 메인 존(인덱스 2-17) 분석
  const mainZone = board.slice(2, 18);
  analysis.main_zone_status = {
    filled_positions: [],
    empty_positions: [],
    current_sequence_length: 0,
    breaks_in_sequence: 0
  };
  
  for (let i = 0; i < mainZone.length; i++) {
    if (mainZone[i] !== null) {
      analysis.main_zone_status.filled_positions.push({
        index: i + 2,
        value: mainZone[i]
      });
    } else {
      analysis.main_zone_status.empty_positions.push(i + 2);
    }
  }
  
  // 확률 계산 (현재 숫자가 조커가 아닌 경우)
  if (currentNumber !== '★') {
    const numericRemaining = remainingNumbers.filter(n => n !== '★' && typeof n === 'number');
    const lessThanCurrent = numericRemaining.filter(n => n < currentNumber).length;
    const moreThanCurrent = numericRemaining.filter(n => n > currentNumber).length;
    const total = lessThanCurrent + moreThanCurrent;
    
    analysis.probability_calculation = {
      less_count: lessThanCurrent,
      more_count: moreThanCurrent,
      ratio: total > 0 ? lessThanCurrent / total : 0.5,
      suggested_main_zone_index: total > 0 ? 2 + Math.floor(15 * (lessThanCurrent / total)) : 9
    };
  }
  
  // 전략 결정
  if (currentNumber === 1) {
    analysis.optimal_strategy = "ANCHOR_PLACEMENT_1";
  } else if (currentNumber === 30) {
    analysis.optimal_strategy = "ANCHOR_PLACEMENT_30";
  } else if (currentNumber === '★') {
    analysis.optimal_strategy = "JOKER_BRIDGE_PLACEMENT";
  } else {
    analysis.optimal_strategy = "PROBABILISTIC_MAIN_ZONE";
  }
  
  return analysis;
}

// 기존 함수들 (호환성 유지)
function canMaintainAscendingOrder(board, index, number) {
  if (number === '★') return true; // 조커는 항상 가능
  
  if (index > 0 && board[index - 1] !== null && board[index - 1] !== '★' && board[index - 1] >= number) {
    return false;
  }
  if (index < 19 && board[index + 1] !== null && board[index + 1] !== '★' && board[index + 1] <= number) {
    return false;
  }
  return true;
}

// 강화된 테스트 함수
function testStrictAscendingRule() {
  Logger.log("=== 엄격한 오름차순 규칙 테스트 시작 ===");
  
  // 실제 사용자가 보고한 시나리오 재현
  const problemBoard = Array(20).fill(null);
  problemBoard[2] = 3;   // 3번째 칸
  problemBoard[3] = 5;   // 4번째 칸  
  problemBoard[4] = 6;   // 5번째 칸
  problemBoard[5] = 8;   // 6번째 칸 - 여기 다음에 7이 오면 안됨!
  
  Logger.log(`문제 상황 보드: ${JSON.stringify(problemBoard)}`);
  
  // 숫자 7이 나왔을 때 테스트
  const testNumber = 7;
  const testRemaining = [1, 2, 4, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, '★'];
  
  Logger.log(`테스트 숫자: ${testNumber}`);
  
  try {
    const result = getAIBestMove(problemBoard, testNumber, testRemaining);
    Logger.log(`결과: ${JSON.stringify(result)}`);
    
    if (result.index === -1 && result.number === "MANUAL_MODE") {
      Logger.log("✅ 성공: 올바르게 수동 모드로 전환됨");
    } else {
      Logger.log("❌ 실패: 수동 모드로 전환되지 않음");
      // AI가 제안한 위치가 오름차순을 위반하는지 추가 확인
      if (result.index === 6 && problemBoard[5] === 8) { // 8 다음에 7 배치
        Logger.log("❌ 심각한 오류: 8 다음에 7을 배치하려 함!");
      }
    }
  } catch (error) {
    Logger.log(`❌ 테스트 오류: ${error.toString()}`);
  }
  
  Logger.log("=== 테스트 완료 ===");
}

// 추가 엄격 테스트
function testEdgeCases() {
  Logger.log("=== 엣지 케이스 테스트 시작 ===");
  
  const testCases = [
    {
      name: "8 다음에 7",
      board: [null, null, null, null, null, 8, null, null, null, null, null, null, null, null, null, null, null, null, null, null],
      number: 7,
      expectManual: true
    },
    {
      name: "5와 10 사이에 12",
      board: [null, null, null, 5, null, 10, null, null, null, null, null, null, null, null, null, null, null, null, null, null],
      number: 12,
      expectManual: true
    },
    {
      name: "5와 10 사이에 7",
      board: [null, null, null, 5, null, 10, null, null, null, null, null, null, null, null, null, null, null, null, null, null],
      number: 7,
      expectManual: false
    },
    {
      name: "조커 배치",
      board: [null, null, null, 5, null, 10, null, null, null, null, null, null, null, null, null, null, null, null, null, null],
      number: '★',
      expectManual: false
    }
  ];
  
  testCases.forEach(testCase => {
    Logger.log(`\n--- ${testCase.name} 테스트 ---`);
    const canPlace = checkMainZoneStrictAscending(testCase.board, testCase.number);
    const shouldBeManual = !canPlace;
    
    if (shouldBeManual === testCase.expectManual) {
      Logger.log(`✅ ${testCase.name}: 정상 (수동 모드: ${shouldBeManual})`);
    } else {
      Logger.log(`❌ ${testCase.name}: 오류 (예상: ${testCase.expectManual}, 실제: ${shouldBeManual})`);
    }
  });
  
  Logger.log("=== 엣지 케이스 테스트 완료 ===");
}