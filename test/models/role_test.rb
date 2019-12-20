require "test_helper"

describe Role do
  setup do
    @api_data = {
      "base_path" => "/government/ministers/prime-minister",
      "links" => {
        "ordered_parent_organisations" => [
          {
            "base_path" => "/government/organisations/cabinet-office",
            "title" => "Cabinet Office",
          },
          {
            "base_path" => "/government/organisations/prime-ministers-office-10-downing-street",
            "title" => "Prime Minister's Office, 10 Downing Street",
          },
        ],
        "role_appointments" => [
          {
            "details" => {
              "current" => false,
            },
            "links" => {
              "person" => [
                {
                  "title" => "The Rt Hon Theresa May",
                  "base_path" => "/government/people/theresa-may",
                },
              ],
            },
          },
          {
            "details" => {
              "current" => true,
            },
            "links" => {
              "person" => [
                {
                  "title" => "The Rt Hon Boris Johnson",
                  "base_path" => "/government/people/boris-johnson",
                  "details" => {
                    "body" => "<p>Boris Johnson became Prime Minister on 24 July 2019. He was previously Foreign Secretary from 13 July 2016 to 9 July 2018. He was elected Conservative MP for Uxbridge and South Ruislip in May 2015. Previously he was the MP for Henley from June 2001 to June 2008.</p> ",
                  },
                },
              ],
            },
          },
        ],
      },
    }
    @content_item = ContentItem.new(@api_data)
    @role = Role.new(@content_item)
  end

  describe "organisations" do
    it "should have organisations title and base_path" do
      expected = [
        {
          "title" => "Cabinet Office",
          "base_path" => "/government/organisations/cabinet-office",
        },
        {
          "title" => "Prime Minister's Office, 10 Downing Street",
          "base_path" => "/government/organisations/prime-ministers-office-10-downing-street",
        },
      ]
      assert_equal expected, @role.organisations
    end
  end

  describe "current_holder" do
    context "without a current holder" do
      setup do
        @api_data["links"]["role_appointments"][1]["details"]["current"] = false
      end

      it "should return nil" do
        assert_nil @role.current_holder
      end
    end

    context "with a current holder" do
      setup do
        @expected = {
          "title" => "The Rt Hon Boris Johnson",
          "base_path" => "/government/people/boris-johnson",
          "details" => {
            "body" => "<p>Boris Johnson became Prime Minister on 24 July 2019. He was previously Foreign Secretary from 13 July 2016 to 9 July 2018. He was elected Conservative MP for Uxbridge and South Ruislip in May 2015. Previously he was the MP for Henley from June 2001 to June 2008.</p> ",
          },
        }
      end

      it "should have title and base_path" do
        assert_equal @expected, @role.current_holder
      end

      it "should have body with biography" do
        assert_equal @expected["details"]["body"], @role.current_holder_biography
      end

      it "should have link to person" do
        assert_equal @expected["base_path"], @role.link_to_person
      end
    end
  end

  describe "announcements" do
    setup do
      @results = [
        { "title" => "PM statement at NATO meeting: 4 December 2019",
          "link" => "/government/speeches/pm-statement-at-nato-meeting-4-december-2019",
          "content_store_document_type" => "speech",
          "public_timestamp" => "2019-11-12T21:07:00.000+00:00",
          "index" => "government",
          "es_score" => nil,
          "_id" => "/government/speeches/pm-statement-at-nato-meeting-4-december-2019",
          "elasticsearch_type" => "edition",
          "document_type" => "edition" },
      ]

      Services.rummager.stubs(:search).returns("results" => @results,
                                               "start" => 0,
                                               "total" => 1)
    end

    it "should have announcements" do
      assert_equal "PM statement at NATO meeting: 4 December 2019", @role.announcements.items.first[:link][:text]
    end

    it "should have link to email signup" do
      assert_equal "/email-signup?link=/government/people/boris-johnson", @role.announcements.links[:email_signup]
    end

    it "should have link to subscription atom feed" do
      assert_equal "https://www.gov.uk/government/people/boris-johnson.atom", @role.announcements.links[:subscribe_to_feed]
    end

    it "should have link to news and communications finder" do
      assert_equal "/search/news-and-communications?people=boris-johnson", @role.announcements.links[:link_to_news_and_communications]
    end
  end
end