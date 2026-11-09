export interface QuestionItem {
  id: number;
  text: string;
}

export interface SurveyGroup {
  id: string;
  group: string;
  shortName: string;
  questions: QuestionItem[];
}

export const LIKERT_LABELS: Record<number, string> = {
  1: 'Hoàn toàn không đồng ý',
  2: 'Không đồng ý',
  3: 'Phân vân / Bình thường',
  4: 'Đồng ý',
  5: 'Hoàn toàn đồng ý'
};

export const OFFICIAL_SURVEY_SECTIONS: SurveyGroup[] = [
  {
    id: "group_1",
    group: "I. MỤC TIÊU VÀ NỘI DUNG KHÓA HỌC",
    shortName: "Mục tiêu & Nội dung",
    questions: [
      { id: 1, text: "Mục tiêu của khóa học được xác định rõ ràng và phù hợp với nhu cầu học tập của sinh viên." },
      { id: 2, text: "Nội dung khóa học phù hợp với mục tiêu và kiến thức, kỹ năng cần đạt được sau khi hoàn thành khóa học." },
      { id: 3, text: "Nội dung khóa học được cập nhật, phù hợp với sự phát triển của công nghệ và nhu cầu thực tế." },
      { id: 4, text: "Cấu trúc và trình tự các nội dung trong khóa học được sắp xếp hợp lý, logic và dễ theo dõi." },
      { id: 5, text: "Tỷ lệ giữa lý thuyết và thực hành trong khóa học phù hợp với đặc điểm và mục tiêu đào tạo." },
      { id: 6, text: "Sinh viên được cung cấp đầy đủ thông tin về nội dung, lịch học, yêu cầu và kết quả cần đạt của khóa học." }
    ]
  },
  {
    id: "group_2",
    group: "II. HOẠT ĐỘNG GIẢNG DẠY VÀ ĐÁNH GIÁ",
    shortName: "Giảng dạy & Đánh giá",
    questions: [
      { id: 7, text: "Giảng viên có kiến thức chuyên môn tốt và nắm vững nội dung của khóa học." },
      { id: 8, text: "Giảng viên trình bày nội dung rõ ràng, dễ hiểu và phù hợp với trình độ của sinh viên." },
      { id: 9, text: "Giảng viên kết hợp hiệu quả giữa kiến thức lý thuyết và thực hành trong quá trình giảng dạy." },
      { id: 10, text: "Phương pháp giảng dạy tạo điều kiện cho sinh viên chủ động thực hành, trao đổi và giải quyết vấn đề." },
      { id: 11, text: "Nội dung và phương pháp kiểm tra, đánh giá phù hợp với nội dung đã được học và mục tiêu của khóa học." },
      { id: 12, text: "Giảng viên phản hồi, giải đáp thắc mắc và hỗ trợ sinh viên kịp thời trong quá trình học tập." }
    ]
  },
  {
    id: "group_3",
    group: "III. CƠ SỞ VẬT CHẤT, TÀI LIỆU VÀ ĐIỀU KIỆN HỌC TẬP",
    shortName: "Cơ sở vật chất & Tài liệu",
    questions: [
      { id: 13, text: "Phòng học và phòng thực hành đáp ứng tốt nhu cầu học tập của sinh viên." },
      { id: 14, text: "Máy tính, thiết bị và phần mềm phục vụ khóa học đáp ứng yêu cầu học tập và thực hành." },
      { id: 15, text: "Hệ thống mạng Internet/Wi-Fi đáp ứng tốt nhu cầu học tập và thực hành của sinh viên." },
      { id: 16, text: "Giáo trình, tài liệu học tập và tài liệu tham khảo được cung cấp đầy đủ và phù hợp với nội dung khóa học." },
      { id: 17, text: "Môi trường học tập tại Trung tâm sạch sẽ, an toàn, thuận tiện và tạo điều kiện cho sinh viên học tập." },
      { id: 18, text: "Các trang thiết bị và cơ sở vật chất phục vụ khóa học được duy trì và hỗ trợ kịp thời khi có vấn đề." }
    ]
  },
  {
    id: "group_4",
    group: "IV. CÔNG TÁC QUẢN LÝ VÀ HỖ TRỢ SINH VIÊN",
    shortName: "Quản lý & Hỗ trợ SV",
    questions: [
      { id: 19, text: "Thông tin về lịch học, phòng học và các thay đổi liên quan đến khóa học được thông báo đầy đủ, chính xác và kịp thời." },
      { id: 20, text: "Quy trình đăng ký, tham gia và hoàn thành khóa học được tổ chức rõ ràng, thuận tiện cho sinh viên." },
      { id: 21, text: "Trung tâm hỗ trợ và giải đáp các thắc mắc của sinh viên về khóa học một cách kịp thời." },
      { id: 22, text: "Các thủ tục liên quan đến học phí, đăng ký, điểm, kết quả học tập và chứng chỉ được thực hiện rõ ràng, thuận tiện." },
      { id: 23, text: "Sinh viên dễ dàng tiếp cận các kênh thông tin và liên hệ với Trung tâm khi cần hỗ trợ." },
      { id: 24, text: "Trung tâm tiếp nhận và phản hồi ý kiến góp ý của sinh viên nhằm cải thiện chất lượng khóa học." }
    ]
  },
  {
    id: "group_5",
    group: "V. KẾT QUẢ HỌC TẬP VÀ MỨC ĐỘ HÀI LÒNG",
    shortName: "Kết quả & Độ hài lòng",
    questions: [
      { id: 25, text: "Khóa học giúp tôi nâng cao kiến thức và kỹ năng công nghệ thông tin cần thiết." },
      { id: 26, text: "Những kiến thức và kỹ năng được học có khả năng ứng dụng vào học tập và công việc thực tế." },
      { id: 27, text: "Sau khóa học, tôi tự tin hơn trong việc sử dụng và ứng dụng các kiến thức, kỹ năng đã được đào tạo." },
      { id: 28, text: "Khóa học đáp ứng được kỳ vọng và nhu cầu học tập của tôi." },
      { id: 29, text: "Tôi hài lòng với chất lượng giảng dạy và các điều kiện hỗ trợ của khóa học." },
      { id: 30, text: "Tôi sẵn sàng giới thiệu khóa học tại Trung tâm CNTT – ITC cho sinh viên có nhu cầu học tập tương tự." }
    ]
  }
];

// Tất cả 30 câu hỏi dạng phẳng
export const ALL_QUESTIONS: QuestionItem[] = OFFICIAL_SURVEY_SECTIONS.flatMap(s => s.questions);

// 5 nhóm tiêu chí tương đương với 5 tiêu chí trong bảng điều khiển
export const DEFAULT_CRITERIA_LIST = OFFICIAL_SURVEY_SECTIONS.map((sec, idx) => ({
  id: sec.id,
  name: sec.shortName,
  fullName: sec.group,
  description: `${sec.questions.length} câu hỏi đánh giá (${sec.questions[0].id}–${sec.questions[sec.questions.length - 1].id})`,
  order_index: idx + 1,
  is_active: true
}));
